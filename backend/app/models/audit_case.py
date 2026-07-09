from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import TimestampMixin


class AuditCase(Base, TimestampMixin):
    """A historical, resolved audit case used as a similar-case RAG source (Phase 8)."""

    __tablename__ = "audit_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Nullable: a case may document a past incident whose source transaction
    # row no longer exists or predates this system.
    transaction_id: Mapped[int | None] = mapped_column(ForeignKey("transactions.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    resolution: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[str | None] = mapped_column(String(255))

    transaction: Mapped["Transaction | None"] = relationship(back_populates="audit_cases")
