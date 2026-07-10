from datetime import date
from decimal import Decimal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Audit Trail Q&A System"
    app_env: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"

    database_url: str

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    backend_cors_origins: str = ""

    # Rule engine (Phase 7)
    threshold_violation_amount: Decimal = Decimal("10000.00")
    duplicate_detection_window_hours: int = 24
    split_payment_window_hours: int = 72
    split_payment_min_count: int = 3
    # Comma-separated YYYY-MM-DD dates, in addition to Sat/Sun, that the
    # weekend_holiday rule treats as non-business days.
    holiday_dates: str = (
        "2025-07-04,2025-11-27,2025-12-25,2026-01-01,2026-02-16,2026-05-25,2026-06-19,2026-07-04"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @property
    def holidays(self) -> set[date]:
        return {date.fromisoformat(d.strip()) for d in self.holiday_dates.split(",") if d.strip()}


settings = Settings()
