"""Budget planning endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import BudgetTarget
from backend.schemas import BudgetPlanResponse, BudgetTargetCreate, BudgetTargetRead
from services.auth import get_current_user, require_editor_user
from services.budget_planner import build_budget_plan_payload


router = APIRouter(prefix="/api", tags=["planning"], dependencies=[Depends(get_current_user)])


@router.get("/budgets", response_model=list[BudgetTargetRead])
def list_budget_targets(
    year: int | None = Query(default=None, ge=2020, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> list[BudgetTargetRead]:
    """List budget targets, optionally filtered by period."""

    query = select(BudgetTarget)
    if year is not None:
        query = query.where(BudgetTarget.year == year)
    if month is not None:
        query = query.where(BudgetTarget.month == month)
    return db.scalars(query.order_by(BudgetTarget.year.desc(), BudgetTarget.month.desc(), BudgetTarget.category.asc())).all()


@router.post("/budgets", response_model=BudgetTargetRead, status_code=status.HTTP_201_CREATED)
def upsert_budget_target(
    payload: BudgetTargetCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> BudgetTargetRead:
    """Create or update one monthly category budget target."""

    existing = db.scalar(
        select(BudgetTarget).where(
            BudgetTarget.year == payload.year,
            BudgetTarget.month == payload.month,
            BudgetTarget.category == payload.category,
        )
    )
    if existing is None:
        target = BudgetTarget(**payload.model_dump())
        db.add(target)
        db.commit()
        db.refresh(target)
        return target

    existing.planned_amount = payload.planned_amount
    existing.notes = payload.notes
    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/budgets/{budget_id}", response_model=dict[str, str], status_code=status.HTTP_200_OK)
def delete_budget_target(
    budget_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor_user),
) -> dict[str, str]:
    """Delete one budget target."""

    target = db.get(BudgetTarget, budget_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget target not found")
    db.delete(target)
    db.commit()
    return {"status": "ok"}


@router.get("/budget-plan", response_model=BudgetPlanResponse)
def get_budget_plan(
    year: int | None = Query(default=None, ge=2020, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> BudgetPlanResponse:
    """Return the monthly budget plan summary."""

    return build_budget_plan_payload(db, year=year, month=month)
