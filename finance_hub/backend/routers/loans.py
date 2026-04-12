"""Loan, investment and study funding endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Investment, Loan
from backend.schemas import (
    InvestmentCreate,
    InvestmentRead,
    LoanCreate,
    LoanRead,
    StudyPlanLine,
    StudyPlanResponse,
)
from services.auth import get_current_user, require_editor_user


router = APIRouter(prefix="/api", tags=["finance"], dependencies=[Depends(get_current_user)])


STUDY_PLAN_COSTS = [
    StudyPlanLine(label="Frais de scolarite", eur=9200),
    StudyPlanLine(label="Loyer et charges", eur=5400),
    StudyPlanLine(label="Alimentation", eur=2100),
    StudyPlanLine(label="Transport", eur=620),
    StudyPlanLine(label="Assurance et sante", eur=480),
    StudyPlanLine(label="Materiel scolaire", eur=450),
    StudyPlanLine(label="Installation", eur=650),
]

STUDY_PLAN_RESOURCES = [
    StudyPlanLine(label="Bourse", eur=3800),
    StudyPlanLine(label="Alternance ou stage", eur=5400),
    StudyPlanLine(label="Aide familiale", eur=2800),
    StudyPlanLine(label="Pret etudiant", eur=3600),
    StudyPlanLine(label="Epargne personnelle", eur=1300),
]


@router.get("/loans", response_model=list[LoanRead])
def list_loans(db: Session = Depends(get_db)) -> list[LoanRead]:
    """List all stored loans."""

    return db.scalars(select(Loan).order_by(Loan.id.asc())).all()


@router.post("/loans", response_model=LoanRead, status_code=status.HTTP_201_CREATED)
def create_loan(
    payload: LoanCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> LoanRead:
    """Create a loan record."""

    loan = Loan(**payload.model_dump())
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


@router.put("/loans/{loan_id}", response_model=LoanRead, status_code=status.HTTP_200_OK)
def update_loan(
    loan_id: int,
    payload: LoanCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> LoanRead:
    """Update one loan record."""

    loan = db.get(Loan, loan_id)
    if loan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    for field, value in payload.model_dump().items():
        setattr(loan, field, value)

    db.commit()
    db.refresh(loan)
    return loan


@router.get("/investments", response_model=list[InvestmentRead])
def list_investments(db: Session = Depends(get_db)) -> list[InvestmentRead]:
    """List all stored investments."""

    return db.scalars(select(Investment).order_by(Investment.id.asc())).all()


@router.post("/investments", response_model=InvestmentRead, status_code=status.HTTP_201_CREATED)
def create_investment(
    payload: InvestmentCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> InvestmentRead:
    """Create an investment record."""

    investment = Investment(**payload.model_dump())
    db.add(investment)
    db.commit()
    db.refresh(investment)
    return investment


@router.put("/investments/{investment_id}", response_model=InvestmentRead, status_code=status.HTTP_200_OK)
def update_investment(
    investment_id: int,
    payload: InvestmentCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> InvestmentRead:
    """Update one investment record."""

    investment = db.get(Investment, investment_id)
    if investment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")

    for field, value in payload.model_dump().items():
        setattr(investment, field, value)

    db.commit()
    db.refresh(investment)
    return investment


@router.get("/study-plan", response_model=StudyPlanResponse)
def get_study_plan() -> StudyPlanResponse:
    """Return a sample study funding plan."""

    total_costs = float(sum(line.eur for line in STUDY_PLAN_COSTS))
    total_resources = float(sum(line.eur for line in STUDY_PLAN_RESOURCES))
    return StudyPlanResponse(
        costs=STUDY_PLAN_COSTS,
        resources=STUDY_PLAN_RESOURCES,
        total_costs=total_costs,
        total_resources=total_resources,
        balance=total_resources - total_costs,
        exchange_rate_eur_usd=1.0,
    )
