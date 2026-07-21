from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import AuditNoteStatus
from app.models.mixins import TimestampMixin


class AuditNote(Base, TimestampMixin):
    __tablename__ = "audit_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    audit_flag_id: Mapped[int] = mapped_column(ForeignKey("audit_flags.id"), nullable=False, index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AuditNoteStatus] = mapped_column(
        Enum(AuditNoteStatus, native_enum=False, length=20),
        default=AuditNoteStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # Policy/case primary keys the AI draft cited, for the explainability
    # requirement (a reviewer must be able to verify the grounding).
    cited_policy_ids: Mapped[list[int] | None] = mapped_column(JSON)
    cited_case_ids: Mapped[list[int] | None] = mapped_column(JSON)

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Dedicated column for reject_note()'s optional reason -- previously
    # appended to `content` as trailing text (see PROGRESS.md), which meant
    # a rejected note's original generated content was never recoverable on
    # its own. Nullable: only ever set on a REJECTED note with a reason.
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    audit_flag: Mapped["AuditFlag"] = relationship(back_populates="audit_notes")
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
    reviewed_by: Mapped["User | None"] = relationship(foreign_keys=[reviewed_by_id])
