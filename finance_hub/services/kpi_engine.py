"""Analytics builders backed by the transactions table."""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Transaction
from backend.schemas import (
    CategoriesResponse,
    CategoryBreakdownItem,
    CumulativePoint,
    CumulativeSeriesResponse,
    KPIResponse,
    MonthlyPoint,
    MonthlySeriesResponse,
)
from services.csv_parser import CATEGORIES, MONTH_LABELS


def _fetch_transactions(db: Session) -> list[Transaction]:
    """Fetch all transactions ordered chronologically."""

    return db.scalars(
        select(Transaction).order_by(Transaction.year.asc(), Transaction.month.asc(), Transaction.id.asc())
    ).all()


def build_kpis_payload(db: Session) -> KPIResponse:
    """Compute the top-level KPI payload."""

    transactions = _fetch_transactions(db)
    if not transactions:
        return KPIResponse(
            total=0.0,
            reimbursed=0.0,
            own=0.0,
            avg_monthly=0.0,
            top_category=None,
            top_category_total=0.0,
            top_month=None,
            top_month_total=0.0,
            transaction_count=0,
            months_count=0,
        )

    total = sum(transaction.amount for transaction in transactions)
    reimbursed = sum(
        transaction.amount for transaction in transactions if transaction.reimbursement_to_parents
    )

    category_totals: dict[str, float] = defaultdict(float)
    month_totals: dict[tuple[int, int], float] = defaultdict(float)

    for transaction in transactions:
        category_totals[transaction.category] += transaction.amount
        month_totals[(transaction.year, transaction.month)] += transaction.amount

    top_category, top_category_total = max(category_totals.items(), key=lambda item: item[1])
    top_month_key, top_month_total = max(month_totals.items(), key=lambda item: item[1])
    top_month = f"{MONTH_LABELS.get(top_month_key[1], str(top_month_key[1]))} {top_month_key[0]}"

    return KPIResponse(
        total=round(total, 2),
        reimbursed=round(reimbursed, 2),
        own=round(total - reimbursed, 2),
        avg_monthly=round(total / len(month_totals), 2),
        top_category=top_category,
        top_category_total=round(top_category_total, 2),
        top_month=top_month,
        top_month_total=round(top_month_total, 2),
        transaction_count=len(transactions),
        months_count=len(month_totals),
    )


def build_monthly_payload(db: Session) -> MonthlySeriesResponse:
    """Build the monthly pivot series used by the dashboard charts."""

    transactions = _fetch_transactions(db)
    grouped: dict[tuple[int, int], dict[str, object]] = {}
    cumulative = 0.0

    for transaction in transactions:
        key = (transaction.year, transaction.month)
        if key not in grouped:
            grouped[key] = {
                "year": transaction.year,
                "month": transaction.month,
                "period": f"{transaction.month_name} {transaction.year}",
                "total": 0.0,
                "categories": {category: 0.0 for category in CATEGORIES},
            }

        grouped[key]["total"] = float(grouped[key]["total"]) + transaction.amount
        categories = grouped[key]["categories"]
        categories[transaction.category] = categories.get(transaction.category, 0.0) + transaction.amount

    items: list[MonthlyPoint] = []
    for key in sorted(grouped):
        point = grouped[key]
        cumulative += float(point["total"])
        items.append(
            MonthlyPoint(
                year=int(point["year"]),
                month=int(point["month"]),
                period=str(point["period"]),
                total=round(float(point["total"]), 2),
                cumulative=round(cumulative, 2),
                categories={name: round(value, 2) for name, value in dict(point["categories"]).items()},
            )
        )

    return MonthlySeriesResponse(items=items)


def build_categories_payload(db: Session) -> CategoriesResponse:
    """Build category totals and shares."""

    transactions = _fetch_transactions(db)
    total = sum(transaction.amount for transaction in transactions)
    category_totals: dict[str, float] = defaultdict(float)

    for transaction in transactions:
        category_totals[transaction.category] += transaction.amount

    items = [
        CategoryBreakdownItem(
            category=category,
            total=round(amount, 2),
            share=round((amount / total) * 100, 2) if total else 0.0,
        )
        for category, amount in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    ]
    return CategoriesResponse(items=items)


def build_cumulative_payload(db: Session) -> CumulativeSeriesResponse:
    """Build the cumulative spend series from monthly totals."""

    monthly = build_monthly_payload(db)
    items = [
        CumulativePoint(
            year=point.year,
            month=point.month,
            period=point.period,
            total=point.total,
            cumulative=point.cumulative,
        )
        for point in monthly.items
    ]
    return CumulativeSeriesResponse(items=items)
