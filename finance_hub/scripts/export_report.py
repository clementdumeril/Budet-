"""Generate a static Finance Hub report for publication."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.config import get_settings
from backend.database import Base, SessionLocal, engine, init_storage
from services.report_publisher import export_static_report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export a static Finance Hub report.")
    parser.add_argument("--output-dir", type=Path, help="Target directory for the published report.")
    parser.add_argument("--title", help="Public report title.")
    parser.add_argument(
        "--months",
        type=int,
        help="Number of recent months to include in the report.",
    )
    parser.add_argument(
        "--include-transactions",
        action="store_true",
        help="Include a short list of recent transactions in the public report.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = get_settings()
    init_storage()
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        result = export_static_report(
            db,
            settings,
            output_dir=args.output_dir,
            title=args.title,
            recent_months=args.months,
            include_transactions=True if args.include_transactions else None,
        )

    print(f"report_dir={result.output_dir}")
    print(f"html={result.html_path}")
    print(f"json={result.json_path}")
    print(f"generated_at={result.generated_at}")


if __name__ == "__main__":
    main()
