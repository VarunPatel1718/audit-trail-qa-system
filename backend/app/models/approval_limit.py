from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import TimestampMixin


class ApprovalLimit(Base, TimestampMixin):
    __tablename__ = "approval_limits"

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False, index=True)
    # Role required to approve transactions at or above max_amount for this department.
    approver_role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False, index=True)
    max_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    department: Mapped["Department"] = relationship(back_populates="approval_limits")
    approver_role: Mapped["Role"] = relationship(back_populates="approval_limits")
