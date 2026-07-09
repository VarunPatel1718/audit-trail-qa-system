from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import DebitCredit, RiskLevel, TransactionStatus
from app.models.mixins import TimestampMixin


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    transaction_ref: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), nullable=False, index=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False, index=True)

    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    debit_credit: Mapped[DebitCredit] = mapped_column(
        Enum(DebitCredit, native_enum=False, length=10), nullable=False
    )
    account_number: Mapped[str | None] = mapped_column(String(50))
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(500))

    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus, native_enum=False, length=20),
        default=TransactionStatus.PENDING,
        nullable=False,
        index=True,
    )
    # Denormalized outputs of the rule engine / risk scoring engine (Phase 7),
    # kept on the row so ledger search/filtering stays index-backed instead of
    # recomputing scores on every query.
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_level: Mapped[RiskLevel | None] = mapped_column(
        Enum(RiskLevel, native_enum=False, length=10), nullable=True, index=True
    )

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    vendor: Mapped["Vendor"] = relationship(back_populates="transactions")
    department: Mapped["Department"] = relationship(back_populates="transactions")
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
    approved_by: Mapped["User | None"] = relationship(foreign_keys=[approved_by_id])

    audit_flags: Mapped[list["AuditFlag"]] = relationship(
        back_populates="transaction", cascade="all, delete-orphan"
    )
    audit_cases: Mapped[list["AuditCase"]] = relationship(back_populates="transaction")
