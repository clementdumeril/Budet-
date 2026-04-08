"""Application settings."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DEFAULT_CSV_PATH = DATA_DIR / "demo-budget.csv"


class Settings(BaseSettings):
    """Environment-backed application settings."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Finance Hub API"
    app_env: str = "development"
    database_url: str = "sqlite:///./data/budget.db"
    csv_path: Path = DEFAULT_CSV_PATH
    bootstrap_demo_data: bool = True
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    session_secret: str = "dev-session-secret-change-me"
    session_cookie_name: str = "finance_hub_session"
    admin_email: str = "demo@financehub.local"
    admin_password: str = "demo1234"
    admin_name: str = "Finance Hub Demo"

    @field_validator("csv_path", mode="before")
    @classmethod
    def resolve_csv_path(cls, value: object) -> Path:
        """Resolve the CSV import path relative to the project root."""

        if isinstance(value, Path):
            return value
        if isinstance(value, str):
            candidate = Path(value)
            if candidate.is_absolute():
                return candidate
            return (BASE_DIR / candidate).resolve()
        return DEFAULT_CSV_PATH

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        """Allow comma-separated origins in `.env`."""

        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        return ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return Settings()
