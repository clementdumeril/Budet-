"""Application settings."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DEFAULT_CSV_PATH = DATA_DIR / "demo-budget.csv"
DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
DEFAULT_SESSION_SECRET = "dev-session-secret-change-me"
DEFAULT_ADMIN_EMAIL = "demo@financehub.local"
DEFAULT_ADMIN_PASSWORD = "demo1234"


class Settings(BaseSettings):
    """Environment-backed application settings."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        enable_decoding=False,
    )

    app_name: str = "Finance Hub API"
    app_env: str = "development"
    database_url: str = "sqlite:///./data/budget.db"
    csv_path: Path = DEFAULT_CSV_PATH
    bootstrap_demo_data: bool = True
    bootstrap_admin: bool = True
    cors_origins: list[str] = DEFAULT_CORS_ORIGINS.copy()
    session_secret: str = DEFAULT_SESSION_SECRET
    session_cookie_name: str = "finance_hub_session"
    session_same_site: str = "lax"
    admin_email: str = DEFAULT_ADMIN_EMAIL
    admin_password: str = DEFAULT_ADMIN_PASSWORD
    admin_name: str = "Finance Hub Demo"
    report_publish_dir: Path = DATA_DIR / "published-report"
    report_title: str = "Finance Hub Report"
    report_recent_months: int = 6
    report_include_transactions: bool = False

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

    @field_validator("report_publish_dir", mode="before")
    @classmethod
    def resolve_report_publish_dir(cls, value: object) -> Path:
        """Resolve the static report directory relative to the project root."""

        if isinstance(value, Path):
            return value
        if isinstance(value, str):
            candidate = Path(value)
            if candidate.is_absolute():
                return candidate
            return (BASE_DIR / candidate).resolve()
        return DATA_DIR / "published-report"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        """Allow comma-separated origins in `.env`."""

        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        return DEFAULT_CORS_ORIGINS.copy()

    @field_validator("session_same_site", mode="before")
    @classmethod
    def normalize_same_site(cls, value: object) -> str:
        allowed = {"lax", "strict", "none"}
        normalized = str(value).strip().lower() if value is not None else "lax"
        if normalized not in allowed:
            raise ValueError(f"SESSION_SAME_SITE must be one of: {', '.join(sorted(allowed))}.")
        return normalized

    @field_validator("report_recent_months", mode="before")
    @classmethod
    def normalize_report_recent_months(cls, value: object) -> int:
        normalized = int(value) if value is not None else 6
        if normalized <= 0:
            raise ValueError("REPORT_RECENT_MONTHS must be a positive integer.")
        return normalized

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @model_validator(mode="after")
    def validate_runtime_settings(self) -> Settings:
        """Refuse obviously unsafe production settings."""

        if not self.is_production:
            return self

        if self.session_secret == DEFAULT_SESSION_SECRET:
            raise ValueError("SESSION_SECRET must be changed in production.")
        if self.bootstrap_demo_data:
            raise ValueError("BOOTSTRAP_DEMO_DATA must be false in production.")
        if self.admin_email.strip().lower() == DEFAULT_ADMIN_EMAIL:
            raise ValueError("ADMIN_EMAIL must be changed in production.")
        if self.admin_password == DEFAULT_ADMIN_PASSWORD:
            raise ValueError("ADMIN_PASSWORD must be changed in production.")
        if not self.cors_origins or all(
            "localhost" in origin or "127.0.0.1" in origin for origin in self.cors_origins
        ):
            raise ValueError("CORS_ORIGINS must include the deployed frontend origin in production.")

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return Settings()
