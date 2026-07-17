from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import AuditNoteStatus
from app.schemas.policy import PolicySearchResult


class AuditNoteDraft(BaseModel):
    """Structured output schema the LLM fills in via forced tool-calling (see
    `app/services/audit_note_service.py`)."""

    summary: str = Field(description="One or two sentence summary of why this transaction was flagged.")
    reasoning: str = Field(
        description="Detailed explanation connecting the rule findings (and policy clauses, if relevant) to the conclusion."
    )
    risk_assessment: str = Field(description="Assessment of the severity of this transaction's risk and why.")
    recommended_action: str = Field(description="Concrete next step the auditor or Finance Manager should take.")
    cited_policy_ids: list[int] = Field(
        default_factory=list,
        description="policy_id values from the retrieved policy context that were actually relied upon. Empty if none are relevant.",
    )


class AuditNoteOut(BaseModel):
    """API/MCP response for a generated audit note.

    `content` is the composed, human-readable note persisted to
    `audit_notes.content`; the structured fields it was composed from are
    also returned individually for callers that want them separately.
    """

    id: int
    transaction_id: int
    audit_flag_id: int
    status: AuditNoteStatus
    created_by_id: int | None
    reviewed_by_id: int | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    summary: str
    reasoning: str
    risk_assessment: str
    recommended_action: str
    content: str
    cited_policy_ids: list[int]
    cited_policies: list[PolicySearchResult]


class RejectAuditNoteRequest(BaseModel):
    reason: str | None = None
