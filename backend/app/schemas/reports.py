from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.enums import RiskLevel, TransactionStatus


class ReportFilterParams(BaseModel):
    """Optional filters for the Reports CSV export -- a smaller subset of
    `TransactionFilterParams` (no vendor_id/amount range/sort/pagination,
    none of which make sense for a full CSV export)."""

    model_config = ConfigDict(extra="forbid")

    date_from: datetime | None = None
    date_to: datetime | None = None
    department_id: int | None = None
    status: TransactionStatus | None = None
    risk_level: RiskLevel | None = None

    @model_validator(mode="after")
    def _validate_range(self) -> "ReportFilterParams":
        if self.date_from is not None and self.date_to is not None and self.date_from > self.date_to:
            raise ValueError("date_from must be before or equal to date_to")
        return self
