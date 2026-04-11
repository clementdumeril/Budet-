"""Minimal smoke checks for local development and CI."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.config import get_settings
from backend.main import app
from backend.database import Base, SessionLocal, engine, init_storage
from services.csv_parser import parse_budget_csv
from services.report_publisher import export_static_report


def main() -> None:
    settings = get_settings()
    routes = {route.path for route in app.routes if hasattr(route, "path")}
    assert "/api/health" in routes, "health endpoint missing"
    assert "/api/transactions" in routes, "transactions endpoint missing"
    assert "/api/budget-plan" in routes, "budget plan endpoint missing"
    assert "/api/budgets" in routes, "budget target endpoint missing"

    if settings.bootstrap_demo_data and settings.csv_path.exists():
        rows = parse_budget_csv(settings.csv_path)
        assert rows, "demo CSV should contain rows"

    init_storage()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        result = export_static_report(db, settings)
        assert result.html_path.exists(), "static report html missing"
        assert result.json_path.exists(), "static report json missing"

    print(f"routes={len(routes)} demo_csv={settings.csv_path}")


if __name__ == "__main__":
    main()
