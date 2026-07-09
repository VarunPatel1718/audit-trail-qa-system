from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import FlagStatus
from app.models.mixins import TimestampMixin


class AuditFlag(Base, TimestampMixin):
    __tablename__ = "audit_flags"

    id: Mapped[int] = mapped_column(primary_key=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"), nullable=False, index=True)

    # Identifies which rule-engine module raised this flag (e.g. "duplicate",
    # "threshold_violation", "benfords_law"). Kept as a plain string rather than
    # a DB enum since rule modules (Phase 7) are added independently of migrations.
    rule_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    risk_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    details: Mapped[str | None] = mapped_column(Text)

    status: Mapped[FlagStatus] = mapped_column(
        Enum(FlagStatus, native_enum=False, length=20), default=FlagStatus.OPEN, nullable=False, index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    transaction: Mapped["Transaction"] = relationship(back_populates="audit_flags")
    audit_notes: Mapped[list["AuditNote"]] = relationship(
        back_populates="audit_flag", cascade="all, delete-orphan"
    )
