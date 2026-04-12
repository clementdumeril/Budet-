"""Accounts and raw data source endpoints for the finance workspace."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Account, ImportSource
from backend.schemas import AccountCreate, AccountRead, ImportSourceCreate, ImportSourceRead
from services.auth import get_current_user, require_editor_user


router = APIRouter(prefix="/api", tags=["workspace"], dependencies=[Depends(get_current_user)])


@router.get("/accounts", response_model=list[AccountRead])
def list_accounts(db: Session = Depends(get_db)) -> list[AccountRead]:
    """List all configured financial accounts."""

    return db.scalars(select(Account).order_by(Account.institution.asc(), Account.label.asc())).all()


@router.post("/accounts", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> AccountRead:
    """Create a financial account."""

    account = Account(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.put("/accounts/{account_id}", response_model=AccountRead, status_code=status.HTTP_200_OK)
def update_account(
    account_id: int,
    payload: AccountCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> AccountRead:
    """Update a financial account."""

    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    for field, value in payload.model_dump().items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)
    return account


@router.get("/import-sources", response_model=list[ImportSourceRead])
def list_import_sources(db: Session = Depends(get_db)) -> list[ImportSourceRead]:
    """List all raw data sources and import pipelines."""

    return db.scalars(select(ImportSource).order_by(ImportSource.id.asc())).all()


@router.post("/import-sources", response_model=ImportSourceRead, status_code=status.HTTP_201_CREATED)
def create_import_source(
    payload: ImportSourceCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> ImportSourceRead:
    """Create a raw data source record."""

    source = ImportSource(**payload.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source
