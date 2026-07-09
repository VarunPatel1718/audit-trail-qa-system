from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import TimestampMixin


class Vendor(Base, TimestampMixin):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    vendor_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(50))
    # Drives the "inactive vendor" rule in the rule engine (Phase 7).
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="vendor")
