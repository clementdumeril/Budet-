"""CSV ingestion and normalization utilities."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

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
    df["category"] = df["raw_category"].astype(str).str.strip().map(CAT_MAP).fillna("Autre")
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


def parse_budget_csv(path: Path) -> list[dict[str, object]]:
    """Parse the raw budget CSV export into normalized transaction dictionaries."""

    return _normalize_budget_rows(_read_csv_buffer_with_fallbacks(path))


def parse_budget_csv_bytes(payload: bytes) -> list[dict[str, object]]:
    """Parse a raw CSV payload provided directly from the browser."""

    return _normalize_budget_rows(_read_csv_buffer_with_fallbacks(payload))


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
