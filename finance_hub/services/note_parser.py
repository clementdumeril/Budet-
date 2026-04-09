"""Free-form note parsing utilities for quick finance capture."""

from __future__ import annotations

import datetime as dt
import re
import unicodedata

from services.csv_parser import CATEGORIES, MONTH_LABELS, normalize_category_label


MONTH_NAME_TO_NUMBER = {
    "janvier": 1,
    "jan": 1,
    "fevrier": 2,
    "fevr": 2,
    "fev": 2,
    "mars": 3,
    "avril": 4,
    "avr": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "juil": 7,
    "aout": 8,
    "aou": 8,
    "septembre": 9,
    "sept": 9,
    "sep": 9,
    "octobre": 10,
    "oct": 10,
    "novembre": 11,
    "nov": 11,
    "decembre": 12,
    "dec": 12,
}
REIMBURSED_TRUE = {"oui", "yes", "true", "1", "parent", "parents", "rembourse", "remboursee", "reimbursed"}
REIMBURSED_FALSE = {"non", "no", "false", "0", "perso", "personnel", "a ma charge", "charge"}


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char)).strip().lower()


def _split_note_line(line: str) -> list[str]:
    cleaned = line.strip().lstrip("-*•").strip()
    if "|" in cleaned:
        parts = cleaned.split("|")
    elif ";" in cleaned:
        parts = cleaned.split(";")
    else:
        parts = re.split(r"\t+", cleaned)
    return [part.strip() for part in parts if part.strip()]


def _parse_amount(value: str) -> float | None:
    cleaned = (
        value.replace("\u00a0", "")
        .replace("EUR", "")
        .replace("€", "")
        .replace(" ", "")
        .replace(",", ".")
        .strip()
    )
    if not cleaned:
        return None
    try:
        amount = float(cleaned)
    except ValueError:
        return None
    amount = abs(amount)
    return amount if amount > 0 else None


def _parse_reimbursed_flag(value: str) -> bool | None:
    normalized = _normalize_text(value)
    if normalized in REIMBURSED_TRUE:
        return True
    if normalized in REIMBURSED_FALSE:
        return False
    return None


def _parse_period_token(value: str) -> tuple[int, int, str, dt.date | None]:
    token = value.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            parsed_date = dt.datetime.strptime(token, fmt).date()
            return parsed_date.year, parsed_date.month, MONTH_LABELS[parsed_date.month], parsed_date
        except ValueError:
            continue

    for fmt in ("%Y-%m", "%Y/%m"):
        try:
            parsed = dt.datetime.strptime(token, fmt)
            return parsed.year, parsed.month, MONTH_LABELS[parsed.month], None
        except ValueError:
            continue

    normalized = _normalize_text(token)
    match = re.match(r"^(?P<month>[a-z]+)\s+(?P<year>\d{4})$", normalized)
    if match:
        month = MONTH_NAME_TO_NUMBER.get(match.group("month"))
        year = int(match.group("year"))
        if month:
            return year, month, MONTH_LABELS[month], None

    raise ValueError(
        "Format de periode invalide. Utilise par exemple 2026-04-08, 08/04/2026, 2026-04 ou Avril 2026."
    )


def parse_note_lines(content: str) -> list[dict[str, object]]:
    """Parse structured note lines into normalized transaction dictionaries."""

    rows: list[dict[str, object]] = []
    lines = [line for line in content.splitlines() if line.strip()]
    if not lines:
        raise ValueError("Aucune note detectee.")

    for index, line in enumerate(lines, start=1):
        parts = _split_note_line(line)
        if len(parts) < 4:
            raise ValueError(
                f"Ligne {index}: format invalide. Utilise 'date | categorie | description | montant | perso/parents'."
            )

        reimbursed = False
        maybe_flag = _parse_reimbursed_flag(parts[-1])
        if maybe_flag is not None:
            reimbursed = maybe_flag
            parts = parts[:-1]

        amount_index = next((position for position in range(len(parts) - 1, -1, -1) if _parse_amount(parts[position]) is not None), -1)
        if amount_index == -1:
            raise ValueError(f"Ligne {index}: montant introuvable.")

        amount_value = _parse_amount(parts[amount_index])
        assert amount_value is not None

        remaining = [part for position, part in enumerate(parts) if position != amount_index]
        if len(remaining) < 3:
            raise ValueError(f"Ligne {index}: il faut au minimum une periode, une categorie et une description.")

        year, month, month_name, exact_date = _parse_period_token(remaining[0])
        category = normalize_category_label(remaining[1])
        description = " | ".join(remaining[2:]).strip()

        rows.append(
            {
                "source_row": index,
                "month_name": month_name,
                "year": year,
                "month": month,
                "date": exact_date,
                "category": category if category in CATEGORIES else "Autre",
                "description": description or None,
                "amount": amount_value,
                "reimbursement_to_parents": reimbursed,
                "source": "note_capture",
            }
        )

    return rows
