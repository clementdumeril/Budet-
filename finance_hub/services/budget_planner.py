"""Budget planning helpers for monthly targets and actuals."""

from __future__ import annotations

import datetime as dt
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import BudgetTarget, Transaction
from backend.schemas import BudgetPlanItem, BudgetPlanResponse
from services.csv_parser import CATEGORIES, MONTH_LABELS


def resolve_budget_period(db: Session, year: int | None = None, month: int | None = None) -> tuple[int, int]:
    """Pick an explicit period or fall back to the latest period with data."""

    if year is not None and month is not None:
        return year, month

    latest_transaction = db.scalar(
        select(Transaction).order_by(Transaction.year.desc(), Transaction.month.desc(), Transaction.id.desc()).limit(1)
    )
    if latest_transaction is not None:
        return latest_transaction.year, latest_transaction.month

    latest_target = db.scalar(
        select(BudgetTarget).order_by(BudgetTarget.year.desc(), BudgetTarget.month.desc(), BudgetTarget.id.desc()).limit(1)
    )
    if latest_target is not None:
        return latest_target.year, latest_target.month

    today = dt.date.today()
    return today.year, today.month


def build_budget_plan_payload(db: Session, year: int | None = None, month: int | None = None) -> BudgetPlanResponse:
    """Build the budget-vs-actual view for one month."""

    selected_year, selected_month = resolve_budget_period(db, year=year, month=month)
    targets = db.scalars(
        select(BudgetTarget)
        .where(BudgetTarget.year == selected_year, BudgetTarget.month == selected_month)
        .order_by(BudgetTarget.category.asc())
    ).all()
    transactions = db.scalars(
        select(Transaction).where(Transaction.year == selected_year, Transaction.month == selected_month)
    ).all()

    planned_totals: dict[str, float] = {target.category: target.planned_amount for target in targets}
    actual_totals: dict[str, float] = defaultdict(float)
    for transaction in transactions:
        actual_totals[transaction.category] += transaction.amount

    visible_categories = [category for category in CATEGORIES if category in planned_totals or actual_totals.get(category, 0) > 0]
    extra_categories = sorted(
        category for category in set(planned_totals).union(actual_totals) if category not in visible_categories
    )
    categories = visible_categories + extra_categories

    items: list[BudgetPlanItem] = []
    for category in categories:
        planned = round(planned_totals.get(category, 0.0), 2)
        actual = round(actual_totals.get(category, 0.0), 2)
        variance = round(actual - planned, 2)
        variance_pct = round((variance / planned) * 100, 2) if planned > 0 else None

        if planned <= 0 and actual > 0:
            status = "unplanned"
        elif variance > 0:
            status = "over"
        elif variance < 0:
            status = "under"
        else:
            status = "on_track"

        items.append(
            BudgetPlanItem(
                category=category,
                planned=planned,
                actual=actual,
                variance=variance,
                variance_pct=variance_pct,
                status=status,
            )
        )

    total_planned = round(sum(item.planned for item in items), 2)
    total_actual = round(sum(item.actual for item in items), 2)
    return BudgetPlanResponse(
        year=selected_year,
        month=selected_month,
        period=f"{MONTH_LABELS.get(selected_month, str(selected_month))} {selected_year}",
        total_planned=total_planned,
        total_actual=total_actual,
        total_variance=round(total_actual - total_planned, 2),
        items=items,
    )
