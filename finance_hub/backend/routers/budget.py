"""Transaction CRUD and CSV import endpoints."""

from __future__ import annotations

import base64
import datetime as dt
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.config import DATA_DIR, get_settings
from backend.database import get_db
from backend.models import ImportSource, Transaction
from backend.schemas import (
    CsvImportResponse,
    CsvPreviewResponse,
    CsvUploadPayload,
    TransactionCreate,
    TransactionListResponse,
    TransactionRead,
    TransactionUpdate,
)
from services.auth import get_current_user, require_editor_user
from services.csv_parser import MONTH_LABELS, import_transactions_from_csv, parse_budget_csv_bytes


router = APIRouter(prefix="/api", tags=["transactions"], dependencies=[Depends(get_current_user)])
settings = get_settings()
IMPORTS_DIR = DATA_DIR / "imports"
IMPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _decode_csv_payload(payload: CsvUploadPayload) -> bytes:
    """Decode a browser-uploaded CSV payload."""

    try:
        content = base64.b64decode(payload.content_base64)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid CSV payload") from exc

    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty CSV payload")
    return content


def _persist_csv_payload(filename: str, content: bytes) -> Path:
    """Persist an uploaded CSV in the project data folder."""

    safe_name = Path(filename).name or "budget-upload.csv"
    timestamp = dt.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    target = IMPORTS_DIR / f"{timestamp}-{safe_name}"
    target.write_bytes(content)
    return target


def _record_csv_import(db: Session, target: Path) -> None:
    """Update the import source registry after a successful CSV import."""

    source = db.scalar(select(ImportSource).where(ImportSource.label == "Primary budget import"))
    relative_path = str(target.relative_to(DATA_DIR.parent))
    imported_at = dt.datetime.utcnow()
    if source is None:
        source = ImportSource(
            label="Primary budget import",
            provider="Browser upload",
            source_type="csv",
            status="connected",
            last_imported_at=imported_at,
            storage_path=relative_path,
            notes="Latest CSV imported from the web interface.",
        )
        db.add(source)
    else:
        source.provider = "Browser upload"
        source.status = "connected"
        source.last_imported_at = imported_at
        source.storage_path = relative_path
        source.notes = "Latest CSV imported from the web interface."
    db.commit()


@router.get("/transactions", response_model=TransactionListResponse)
def list_transactions(
    category: str | None = None,
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2020, le=2100),
    reimbursed: bool | None = None,
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    """List transactions with filters, pagination and text search."""

    query = select(Transaction)
    count_query = select(func.count(Transaction.id))

    if category:
        query = query.where(Transaction.category == category)
        count_query = count_query.where(Transaction.category == category)
    if month:
        query = query.where(Transaction.month == month)
        count_query = count_query.where(Transaction.month == month)
    if year:
        query = query.where(Transaction.year == year)
        count_query = count_query.where(Transaction.year == year)
    if reimbursed is not None:
        query = query.where(Transaction.reimbursement_to_parents == reimbursed)
        count_query = count_query.where(Transaction.reimbursement_to_parents == reimbursed)
    if q:
        search = f"%{q.strip()}%"
        query = query.where(Transaction.description.ilike(search))
        count_query = count_query.where(Transaction.description.ilike(search))

    total = db.scalar(count_query) or 0
    items = db.scalars(
        query.order_by(Transaction.year.desc(), Transaction.month.desc(), Transaction.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return TransactionListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/transactions", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> TransactionRead:
    """Create a manual transaction."""

    month_name = payload.month_name or MONTH_LABELS.get(payload.month, str(payload.month))
    transaction = Transaction(
        month_name=month_name,
        year=payload.year,
        month=payload.month,
        date=payload.date,
        category=payload.category,
        description=payload.description,
        amount=payload.amount,
        reimbursement_to_parents=payload.reimbursement_to_parents,
        source=payload.source,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/transactions/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> TransactionRead:
    """Update a single transaction."""

    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    updates = payload.model_dump(exclude_unset=True)
    if "month" in updates and "month_name" not in updates:
        updates["month_name"] = MONTH_LABELS.get(updates["month"], str(updates["month"]))

    for field, value in updates.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/transactions/{transaction_id}", response_model=dict[str, str], status_code=status.HTTP_200_OK)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> dict[str, str]:
    """Delete a transaction."""

    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    db.delete(transaction)
    db.commit()
    return {"status": "ok"}


@router.post("/import-csv", response_model=dict[str, int | str])
def import_csv(
    csv_path: str | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> dict[str, int | str]:
    """Import transactions from the configured CSV or an explicit file path."""

    selected_path = Path(csv_path).expanduser().resolve() if csv_path else settings.csv_path
    if not selected_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CSV file not found")

    imported_count = import_transactions_from_csv(db, selected_path, replace_existing=True)
    return {"status": "ok", "imported": imported_count, "path": str(selected_path)}


@router.post("/import-csv/preview", response_model=CsvPreviewResponse)
def preview_uploaded_csv(
    payload: CsvUploadPayload,
    _: object = Depends(require_editor_user),
) -> CsvPreviewResponse:
    """Preview normalized CSV rows before importing them."""

    content = _decode_csv_payload(payload)
    rows = parse_budget_csv_bytes(content)
    categories = sorted({str(row["category"]) for row in rows})
    preview = rows[:8]
    return CsvPreviewResponse(
        filename=payload.filename,
        detected_rows=len(rows),
        categories=categories,
        preview=preview,
    )


@router.post("/import-csv/upload", response_model=CsvImportResponse)
def upload_csv_and_import(
    payload: CsvUploadPayload,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> CsvImportResponse:
    """Persist a browser-uploaded CSV and import it into the database."""

    content = _decode_csv_payload(payload)
    target = _persist_csv_payload(payload.filename, content)
    imported_count = import_transactions_from_csv(db, target, replace_existing=payload.replace_existing)
    _record_csv_import(db, target)
    return CsvImportResponse(
        status="ok",
        imported=imported_count,
        filename=payload.filename,
        path=str(target),
    )
