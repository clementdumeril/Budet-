"""Database bootstrap and session utilities."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from backend.config import BASE_DIR, DATA_DIR, get_settings


settings = get_settings()
DATABASE_URL = settings.database_url

if DATABASE_URL.startswith("sqlite:///./"):
    sqlite_relative_path = DATABASE_URL.replace("sqlite:///./", "", 1)
    DATABASE_URL = f"sqlite:///{(BASE_DIR / sqlite_relative_path).resolve().as_posix()}"

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
