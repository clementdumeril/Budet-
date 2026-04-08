"""FastAPI entrypoint for the Finance Hub MVP."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import func, select

from backend.config import get_settings
from backend.database import Base, SessionLocal, engine, init_storage
from backend.models import Transaction
from backend.routers import analytics, auth, budget, loans, workspace
from services.auth import bootstrap_initial_admin
from services.csv_parser import import_transactions_from_csv
from services.seed_finance import bootstrap_finance_workspace


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize storage and import the source CSV on first launch."""

    init_storage()
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        bootstrap_initial_admin(db)
        transaction_count = db.scalar(select(func.count(Transaction.id))) or 0
        if settings.bootstrap_demo_data:
            if transaction_count == 0 and settings.csv_path.exists():
                import_transactions_from_csv(db, settings.csv_path)
            bootstrap_finance_workspace(db)

    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie=settings.session_cookie_name,
    same_site="lax",
    https_only=settings.app_env == "production",
    max_age=60 * 60 * 24 * 14,
)

app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(budget.router)
app.include_router(loans.router)
app.include_router(workspace.router)


@app.get("/api/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    """Return a simple health signal for local checks."""

    return {"status": "ok"}
