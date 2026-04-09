"""CSV ingestion and normalization utilities."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
import re
import unicodedata

import pandas as pd
from sqlalchemy.orm import Session

from backend.models import Transaction


MONTH_ORDER = {
    "Janvier": 1,
    "Fevrier": 2,
    "Mars": 3,
    "Avril": 4,
    "Mai": 5,
    "Juin": 6,
    "Juillet": 7,
    "Aout": 8,
    "Septembre": 9,
    "Octobre": 10,
    "Novembre": 11,
    "Decembre": 12,
}
MONTH_LABELS = {value: key for key, value in MONTH_ORDER.items()}
CAT_MAP = {
    "food": "Alimentation",
    "Food": "Alimentation",
    "Groceries": "Alimentation",
    "Carrefour City": "Alimentation",
    "train": "Transport",
    "Train": "Transport",
    "Transport": "Transport",
    "Bus": "Transport",
    "Rent": "Loyer",
    "Housing": "Loyer",
    "Loisirs": "Loisirs",
    "Subscription": "Abonnements",
    "Health": "Sante",
    "School": "Scolarite",
    "One Time": "Ponctuel",
    "ENSAM": "Scolarite",
    "Auto ecole": "Transport",
    "Other": "Autre",
    "other": "Autre",
}
CATEGORIES = ["Alimentation", "Transport", "Loyer", "Loisirs", "Abonnements", "Sante", "Scolarite", "Ponctuel", "Autre"]
COLUMN_ALIASES = {
    "date": {"date", "operationdate", "transactiondate", "bookingdate"},
    "month_name": {"monthname", "mois", "monthlabel"},
    "year": {"year", "annee"},
    "month": {"month", "monthnumber", "monthnum", "moisnumero", "moisnum"},
    "raw_category": {"category", "categorie", "type", "poste", "rubrique"},
    "description": {"description", "label", "libelle", "merchant", "details", "intitule"},
    "amount": {"amount", "montant", "value", "valeur", "expense"},
    "debit": {"debit", "debits", "withdrawal"},
    "credit": {"credit", "credits", "deposit"},
    "reimbursement": {"reimbursement", "reimbursed", "remboursement", "parents", "priseencharge"},
}
TRUTHY_REIMBURSEMENT = {"yes", "oui", "true", "1", "parents", "parent", "reimbursed", "rembourse"}


def _normalize_text(value: object) -> str:
    normalized = unicodedata.normalize("NFKD", str(value))
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "", normalized.lower())


def normalize_category_label(value: object) -> str:
    label = str(value).strip()
    if not label:
        return "Autre"
    if label in CATEGORIES:
        return label
    return CAT_MAP.get(label) or CAT_MAP.get(label.lower()) or "Autre"


def _parse_amount_series(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.fillna("")
        .astype(str)
        .str.replace("\u00a0", "", regex=False)
        .str.replace("€", "", regex=False)
        .str.replace("EUR", "", regex=False)
        .str.replace(" ", "", regex=False)
        .str.replace(",", ".", regex=False),
        errors="coerce",
    )


def _find_column(columns: list[str], target: str) -> str | None:
    aliases = COLUMN_ALIASES[target]
    for column in columns:
        if _normalize_text(column) in aliases:
            return column
    return None


def _read_csv_auto_with_fallbacks(buffer: bytes | Path) -> pd.DataFrame:
    last_error: Exception | None = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            if isinstance(buffer, Path):
                return pd.read_csv(buffer, sep=None, engine="python", encoding=encoding)
            return pd.read_csv(BytesIO(buffer), sep=None, engine="python", encoding=encoding)
        except (UnicodeDecodeError, pd.errors.ParserError, ValueError) as exc:
            last_error = exc

    if last_error is not None:
        raise last_error
    if isinstance(buffer, Path):
        raise FileNotFoundError(buffer)
    raise ValueError("Unable to decode CSV payload")


def _read_csv_buffer_with_fallbacks(buffer: bytes | Path) -> pd.DataFrame:
    """Read a CSV payload with permissive encoding fallbacks."""

    last_error: Exception | None = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            if isinstance(buffer, Path):
                return pd.read_csv(buffer, header=None, encoding=encoding)
            return pd.read_csv(BytesIO(buffer), header=None, encoding=encoding)
        except UnicodeDecodeError as exc:
            last_error = exc

    if last_error is not None:
        raise last_error
    if isinstance(buffer, Path):
        raise FileNotFoundError(buffer)
    raise ValueError("Unable to decode CSV payload")


def _normalize_budget_rows(raw: pd.DataFrame) -> list[dict[str, object]]:
    """Normalize the raw budget export into transaction dictionaries."""

    df = raw.iloc[1:].rename(
        columns={
            1: "month_name",
            2: "year",
            3: "raw_category",
            4: "description",
            5: "amount",
            6: "reimbursement",
        }
    )
    df = df[["month_name", "year", "raw_category", "description", "amount", "reimbursement"]].copy()
    df = df.dropna(subset=["month_name", "amount"])

    df["month_name"] = df["month_name"].astype(str).str.strip()
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["amount"] = (
        df["amount"]
        .astype(str)
        .str.replace("\u00a0", "", regex=False)
        .str.replace(" ", "", regex=False)
        .str.replace(",", ".", regex=False)
    )
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["month"] = df["month_name"].map(MONTH_ORDER)
    df["category"] = df["raw_category"].apply(normalize_category_label)
    df["reimbursement_to_parents"] = (
        df["reimbursement"].astype(str).str.strip().str.lower().eq("yes")
    )
    df["description"] = df["description"].fillna("").astype(str).str.strip()

    df = df.dropna(subset=["year", "month", "amount"])
    df = df[df["amount"] > 0].copy()
    df["year"] = df["year"].astype(int)
    df["month"] = df["month"].astype(int)
    df["category"] = df["category"].apply(lambda value: value if value in CATEGORIES else "Autre")
    df = df.sort_values(["year", "month"]).reset_index(drop=True)
    df["source_row"] = df.index + 2

    return df.to_dict("records")


def _normalize_flexible_rows(raw: pd.DataFrame) -> list[dict[str, object]]:
    columns = list(raw.columns)
    date_col = _find_column(columns, "date")
    month_name_col = _find_column(columns, "month_name")
    year_col = _find_column(columns, "year")
    month_col = _find_column(columns, "month")
    category_col = _find_column(columns, "raw_category")
    description_col = _find_column(columns, "description")
    amount_col = _find_column(columns, "amount")
    debit_col = _find_column(columns, "debit")
    credit_col = _find_column(columns, "credit")
    reimbursement_col = _find_column(columns, "reimbursement")

    if category_col is None or description_col is None or (amount_col is None and debit_col is None and credit_col is None):
        raise ValueError("Unsupported CSV format")

    df = raw.copy()
    parsed_date = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True) if date_col else None

    if amount_col:
        amount = _parse_amount_series(df[amount_col])
    else:
        debit = _parse_amount_series(df[debit_col]) if debit_col else pd.Series([None] * len(df))
        credit = _parse_amount_series(df[credit_col]) if credit_col else pd.Series([None] * len(df))
        amount = debit.fillna(credit).abs()

    if year_col:
        year = pd.to_numeric(df[year_col], errors="coerce")
    elif parsed_date is not None:
        year = parsed_date.dt.year
    else:
        raise ValueError("Missing year/date information")

    if month_col:
        month = pd.to_numeric(df[month_col], errors="coerce")
    elif month_name_col:
        month = df[month_name_col].astype(str).str.strip().map(MONTH_ORDER)
    elif parsed_date is not None:
        month = parsed_date.dt.month
    else:
        raise ValueError("Missing month/date information")

    reimbursement = (
        df[reimbursement_col].astype(str).str.strip().str.lower().isin(TRUTHY_REIMBURSEMENT)
        if reimbursement_col
        else pd.Series([False] * len(df))
    )
    description = df[description_col].fillna("").astype(str).str.strip()
    category = df[category_col].apply(normalize_category_label)

    normalized = pd.DataFrame(
        {
            "year": year,
            "month": month,
            "category": category,
            "description": description,
            "amount": amount,
            "reimbursement_to_parents": reimbursement,
        }
    )
    if parsed_date is not None:
        normalized["date"] = parsed_date.dt.date

    normalized = normalized.dropna(subset=["year", "month", "amount"])
    normalized = normalized[normalized["amount"] > 0].copy()
    normalized["year"] = normalized["year"].astype(int)
    normalized["month"] = normalized["month"].astype(int)
    normalized["month_name"] = normalized["month"].map(lambda value: MONTH_LABELS.get(int(value), str(value)))
    normalized["category"] = normalized["category"].apply(lambda value: value if value in CATEGORIES else "Autre")
    normalized = normalized.sort_values(["year", "month"]).reset_index(drop=True)
    normalized["source_row"] = normalized.index + 2
    return normalized.to_dict("records")


def parse_csv_rows(payload: bytes | Path) -> list[dict[str, object]]:
    """Parse either the legacy budget export or a normalized/flexible CSV."""

    try:
        rows = _normalize_flexible_rows(_read_csv_auto_with_fallbacks(payload))
    except Exception:
        try:
            rows = _normalize_budget_rows(_read_csv_buffer_with_fallbacks(payload))
        except Exception as exc:
            raise ValueError(
                "CSV non reconnu. Utilise soit le modele Finance Hub, soit le prompt de normalisation fourni dans l'interface."
            ) from exc

    if not rows:
        raise ValueError(
            "Aucune depense exploitable detectee dans ce CSV. Verifie les colonnes date/categorie/description/montant."
        )
    return rows


def parse_budget_csv(path: Path) -> list[dict[str, object]]:
    """Parse the raw budget CSV export into normalized transaction dictionaries."""

    return parse_csv_rows(path)


def parse_budget_csv_bytes(payload: bytes) -> list[dict[str, object]]:
    """Parse a raw CSV payload provided directly from the browser."""

    return parse_csv_rows(payload)


def import_transactions_from_csv(
    db: Session,
    path: Path,
    *,
    replace_existing: bool = False,
) -> int:
    """Import normalized CSV rows into the transactions table."""

    if replace_existing:
        db.query(Transaction).delete()
        db.commit()

    rows = parse_budget_csv(path)
    transactions = [
        Transaction(
            source_row=int(row["source_row"]),
            month_name=str(row["month_name"]),
            year=int(row["year"]),
            month=int(row["month"]),
            date=row.get("date"),
            category=str(row["category"]),
            description=str(row["description"]) or None,
            amount=float(row["amount"]),
            reimbursement_to_parents=bool(row["reimbursement_to_parents"]),
            source="csv_import",
        )
        for row in rows
    ]

    db.add_all(transactions)
    db.commit()
    return len(transactions)
