"""Analytics endpoints powering the dashboard charts and KPIs."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import CategoriesResponse, CumulativeSeriesResponse, KPIResponse, MonthlySeriesResponse
from services.auth import get_current_user
from services.kpi_engine import (
    build_categories_payload,
    build_cumulative_payload,
    build_kpis_payload,
    build_monthly_payload,
)


router = APIRouter(prefix="/api/analytics", tags=["analytics"], dependencies=[Depends(get_current_user)])


@router.get("/kpis", response_model=KPIResponse)
def get_kpis(db: Session = Depends(get_db)) -> KPIResponse:
    """Return the KPI summary used by the dashboard hero cards."""

    return build_kpis_payload(db)


@router.get("/monthly", response_model=MonthlySeriesResponse)
def get_monthly(db: Session = Depends(get_db)) -> MonthlySeriesResponse:
    """Return the monthly pivot used by charts."""

    return build_monthly_payload(db)


@router.get("/categories", response_model=CategoriesResponse)
def get_categories(db: Session = Depends(get_db)) -> CategoriesResponse:
    """Return category totals and shares for breakdown charts."""

    return build_categories_payload(db)


@router.get("/cumulative", response_model=CumulativeSeriesResponse)
def get_cumulative(db: Session = Depends(get_db)) -> CumulativeSeriesResponse:
    """Return the cumulative spend curve."""

    return build_cumulative_payload(db)
