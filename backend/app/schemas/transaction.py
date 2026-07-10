from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import DebitCredit, RiskLevel, TransactionStatus


class TransactionSortField(str, Enum):
    TRANSACTION_DATE = "transaction_date"
    AMOUNT = "amount"
    RISK_SCORE = "risk_score"
    CREATED_AT = "created_at"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class TransactionFilterParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date_from: datetime | None = None
    date_to: datetime | None = None
    vendor_id: int | None = None
    department_id: int | None = None
    amount_min: Decimal | None = Field(default=None, ge=0)
    amount_max: Decimal | None = Field(default=None, ge=0)
    status: TransactionStatus | None = None

    sort_by: TransactionSortField = TransactionSortField.TRANSACTION_DATE
    sort_order: SortOrder = SortOrder.DESC

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)

    @model_validator(mode="after")
    def _validate_ranges(self) -> "TransactionFilterParams":
        if self.date_from is not None and self.date_to is not None and self.date_from > self.date_to:
            raise ValueError("date_from must be before or equal to date_to")
        if (
            self.amount_min is not None
            and self.amount_max is not None
            and self.amount_min > self.amount_max
        ):
            raise ValueError("amount_min must be less than or equal to amount_max")
        return self


class VendorSummary(BaseModel):
    id: int
    name: str
    vendor_code: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DepartmentSummary(BaseModel):
    id: int
    name: str
    code: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TransactionOut(BaseModel):
    id: int
    transaction_ref: str
    vendor_id: int
    department_id: int
    amount: Decimal
    currency: str
    debit_credit: DebitCredit
    account_number: str | None
    transaction_date: datetime
    description: str | None
    status: TransactionStatus
    risk_score: int
    risk_level: RiskLevel | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionDetailOut(TransactionOut):
    vendor: VendorSummary
    department: DepartmentSummary


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
    total_pages: int
