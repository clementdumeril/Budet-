"""Database bootstrap and session utilities."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from backend.config import BASE_DIR, DATA_DIR, get_settings


settings = get_settings()
DATABASE_URL = settings.database_url


def _normalize_database_url(raw_url: str) -> str:
    """Normalize provider URLs into SQLAlchemy-compatible connection strings."""

    if raw_url.startswith("sqlite:///./"):
        sqlite_relative_path = raw_url.replace("sqlite:///./", "", 1)
        return f"sqlite:///{(BASE_DIR / sqlite_relative_path).resolve().as_posix()}"

    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)

    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return raw_url


DATABASE_URL = _normalize_database_url(DATABASE_URL)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)
Base = declarative_base()


def init_storage() -> None:
    """Ensure the SQLite folder exists before opening the engine."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for FastAPI dependencies."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
