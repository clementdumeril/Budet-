"""Pydantic schemas for API input and output."""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    """Shared transaction fields."""

    month_name: str | None = None
    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)
    date: dt.date | None = None
    category: str
    description: str | None = None
    amount: float = Field(gt=0)
    reimbursement_to_parents: bool = False
    source: str = "manual"


class TransactionCreate(TransactionBase):
    """Transaction creation payload."""


class TransactionUpdate(BaseModel):
    """Transaction update payload."""

    month_name: str | None = None
    year: int | None = Field(default=None, ge=2020, le=2100)
    month: int | None = Field(default=None, ge=1, le=12)
    date: dt.date | None = None
    category: str | None = None
    description: str | None = None
    amount: float | None = Field(default=None, gt=0)
    reimbursement_to_parents: bool | None = None
    source: str | None = None


class TransactionRead(TransactionBase):
    """Transaction response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    source_row: int | None = None
    created_at: dt.datetime


class TransactionListResponse(BaseModel):
    """Paginated transaction list."""

    items: list[TransactionRead]
    total: int
    limit: int
    offset: int


class KPIResponse(BaseModel):
    """Top-level KPIs for the dashboard."""

    total: float
    reimbursed: float
    own: float
    avg_monthly: float
    top_category: str | None
    top_category_total: float
    top_month: str | None
    top_month_total: float
    transaction_count: int
    months_count: int


class CategoryBreakdownItem(BaseModel):
    """Category aggregate."""

    category: str
    total: float
    share: float


class CategoriesResponse(BaseModel):
    """Category totals and shares."""

    items: list[CategoryBreakdownItem]


class MonthlyPoint(BaseModel):
    """Monthly pivot point used by charts."""

    year: int
    month: int
    period: str
    total: float
    cumulative: float
    categories: dict[str, float]


class MonthlySeriesResponse(BaseModel):
    """Monthly time series response."""

    items: list[MonthlyPoint]


class CumulativePoint(BaseModel):
    """Cumulative spending curve point."""

    year: int
    month: int
    period: str
    total: float
    cumulative: float


class CumulativeSeriesResponse(BaseModel):
    """Cumulative curve response."""

    items: list[CumulativePoint]


class LoanBase(BaseModel):
    """Shared loan fields."""

    type: str
    amount: float
    rate: float | None = None
    start_label: str | None = None
    due_label: str | None = None
    status: str
    notes: str | None = None


class LoanCreate(LoanBase):
    """Loan creation payload."""


class LoanRead(LoanBase):
    """Loan response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int


class AccountBase(BaseModel):
    """Shared financial account fields."""

    label: str
    institution: str
    type: str
    currency: str = "EUR"
    balance: float | None = None
    last4: str | None = None
    is_active: bool = True
    notes: str | None = None


class AccountCreate(AccountBase):
    """Account creation payload."""


class AccountRead(AccountBase):
    """Account response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int


class InvestmentBase(BaseModel):
    """Shared investment fields."""

    type: str
    amount: float
    date_label: str | None = None
    current_value: float | None = None
    notes: str | None = None


class InvestmentCreate(InvestmentBase):
    """Investment creation payload."""


class InvestmentRead(InvestmentBase):
    """Investment response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int


class ImportSourceBase(BaseModel):
    """Shared raw import source fields."""

    label: str
    provider: str
    source_type: str
    status: str
    last_imported_at: dt.datetime | None = None
    storage_path: str | None = None
    notes: str | None = None


class ImportSourceCreate(ImportSourceBase):
    """Import source creation payload."""


class ImportSourceRead(ImportSourceBase):
    """Import source response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int


class CsvUploadPayload(BaseModel):
    """Raw CSV payload sent from the browser."""

    filename: str
    content_base64: str
    replace_existing: bool = True


class CsvPreviewRow(BaseModel):
    """Single normalized row shown in the import preview."""

    month_name: str
    year: int
    category: str
    description: str | None
    amount: float
    reimbursement_to_parents: bool


class CsvPreviewResponse(BaseModel):
    """Preview metadata for an uploaded CSV before import."""

    filename: str
    detected_rows: int
    categories: list[str]
    preview: list[CsvPreviewRow]


class CsvImportResponse(BaseModel):
    """Import result payload for an uploaded CSV."""

    status: str
    imported: int
    filename: str
    path: str


class NotesParsePayload(BaseModel):
    """Free-form notes payload sent from the browser."""

    content: str
    replace_existing: bool = True


class NotesPreviewResponse(BaseModel):
    """Preview metadata for note-based capture before import."""

    detected_rows: int
    categories: list[str]
    preview: list[CsvPreviewRow]


class NotesImportResponse(BaseModel):
    """Import result payload for note-based capture."""

    status: str
    imported: int


class StudyPlanLine(BaseModel):
    """A cost or resource line in a study funding plan."""

    label: str
    eur: float


class StudyPlanResponse(BaseModel):
    """Funding summary for a generic study plan."""

    costs: list[StudyPlanLine]
    resources: list[StudyPlanLine]
    total_costs: float
    total_resources: float
    balance: float
    exchange_rate_eur_usd: float


class UserRead(BaseModel):
    """Authenticated user payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: dt.datetime


class LoginRequest(BaseModel):
    """Email/password login payload."""

    email: str
    password: str


class AuthResponse(BaseModel):
    """Current authenticated session payload."""

    user: UserRead
