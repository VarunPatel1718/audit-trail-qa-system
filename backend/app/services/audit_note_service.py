"""Audit note generation service (Phase 10).

Ties together the flagged transaction (Phase 6/7), policy retrieval (Phase 8),
and an LLM into one explainable, structured audit note, persisted to
`audit_notes`. Used by both `POST /transactions/{id}/generate-audit-note` and
the `generate_audit_note` MCP tool so the two stay behind one implementation.

LLM provider is Groq (Llama 3.3 70B), not the Claude API design.docx
specifies -- switched for cost reasons; see docs/requirements.md and
PROGRESS.md decisions log. Structured output is enforced via Groq's
OpenAI-compatible tool-calling (forced tool_choice), since Groq has no
Claude-style declarative `output_format` -- the tool's JSON schema is
generated directly from `AuditNoteDraft` so the request schema and the
response validation can never drift apart.
"""

import json
import re

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit_flag import AuditFlag
from app.models.audit_note import AuditNote
from app.models.enums import AuditNoteStatus
from app.prompts.audit_note import SYSTEM_PROMPT, build_policy_query, build_user_message
from app.schemas.audit_note import AuditNoteDraft, AuditNoteOut
from app.schemas.policy import PolicySearchResult
from app.services.groq_client import get_groq_client
from app.services.ledger_service import get_transaction_by_id
from app.services.policy_search import get_policies_by_ids, search_policies
from app.services.risk_scoring import get_open_flags

_AUDIT_NOTE_TOOL_NAME = "submit_audit_note"

# Backstop for an observed Groq/Llama failure mode: the model discusses a
# specific policy_id inline in `reasoning` (echoing our own "policy_id=<id>"
# formatting from `_format_policies()` in app/prompts/audit_note.py) but
# leaves it out of the structured `cited_policy_ids` field on the very same
# tool call -- the two fields aren't guaranteed consistent with each other
# the way they would be under Claude's schema-enforced structured output.
_POLICY_ID_MENTION_RE = re.compile(r"policy_id\D{0,3}(\d+)", re.IGNORECASE)


def _extract_mentioned_policy_ids(text: str) -> set[int]:
    return {int(match) for match in _POLICY_ID_MENTION_RE.findall(text)}


class AuditNoteError(Exception):
    """Raised for any failure generating an audit note; `code` lets callers
    (HTTP endpoint, MCP tool) map to their own error representation."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _pick_primary_flag(flags: list[AuditFlag]) -> AuditFlag:
    """The note is one holistic explanation of a transaction (design.docx's
    workflow drafts a single audit note per transaction), but `audit_notes.
    audit_flag_id` is a required FK to exactly one flag. Anchor it to the
    highest-risk_points open flag (ties broken by lowest id, i.e. first
    raised) as the "primary reason", while the note content itself still
    addresses every open flag."""
    return sorted(flags, key=lambda f: (-f.risk_points, f.id))[0]


def _compose_content(draft: AuditNoteDraft) -> str:
    return (
        f"Summary: {draft.summary}\n\n"
        f"Reasoning: {draft.reasoning}\n\n"
        f"Risk Assessment: {draft.risk_assessment}\n\n"
        f"Recommended Action: {draft.recommended_action}"
    )


# Inverse of _compose_content()'s fixed template, used only by the read-only
# get_latest_audit_note() below to give GET /transactions/{id}/audit-note the
# same response shape as the generation endpoint (which has summary/
# reasoning/risk_assessment/recommended_action as separate fields on the LLM
# draft) even though only the composed `content` string is actually
# persisted on the AuditNote row.
_CONTENT_SECTIONS_RE = re.compile(
    r"^Summary: (?P<summary>.*?)\n\n"
    r"Reasoning: (?P<reasoning>.*?)\n\n"
    r"Risk Assessment: (?P<risk_assessment>.*?)\n\n"
    r"Recommended Action: (?P<recommended_action>.*)$",
    re.DOTALL,
)


def _parse_content(content: str) -> tuple[str, str, str, str]:
    match = _CONTENT_SECTIONS_RE.match(content)
    if match is None:
        # Row doesn't match the expected format (e.g. a future hand-edited
        # note) -- degrade gracefully rather than 500ing the read endpoint.
        return content, "", "", ""
    return (
        match.group("summary"),
        match.group("reasoning"),
        match.group("risk_assessment"),
        match.group("recommended_action"),
    )


def get_latest_audit_note(db: Session, transaction_id: int) -> AuditNoteOut | None:
    """Read-only: returns the most recently generated audit note for a
    transaction, if one exists. Never calls the LLM and never writes
    anything -- unlike generate_audit_note(), which has no idempotency check
    yet (see PROGRESS.md), so more than one note can already exist for the
    same transaction; this picks the most recent by created_at (ties broken
    by highest id) rather than surfacing every duplicate."""
    note = db.scalars(
        select(AuditNote)
        .join(AuditFlag, AuditNote.audit_flag_id == AuditFlag.id)
        .where(AuditFlag.transaction_id == transaction_id)
        .order_by(AuditNote.created_at.desc(), AuditNote.id.desc())
        .limit(1)
    ).first()

    if note is None:
        return None

    summary, reasoning, risk_assessment, recommended_action = _parse_content(note.content)

    cited_policy_ids = note.cited_policy_ids or []
    cited_policies = get_policies_by_ids(db, cited_policy_ids) if cited_policy_ids else []

    return AuditNoteOut(
        id=note.id,
        transaction_id=transaction_id,
        audit_flag_id=note.audit_flag_id,
        status=note.status,
        created_by_id=note.created_by_id,
        summary=summary,
        reasoning=reasoning,
        risk_assessment=risk_assessment,
        recommended_action=recommended_action,
        content=note.content,
        cited_policy_ids=cited_policy_ids,
        cited_policies=cited_policies,
    )


def generate_audit_note(
    db: Session, transaction_id: int, created_by_id: int | None = None
) -> AuditNoteOut:
    transaction = get_transaction_by_id(db, transaction_id)
    if transaction is None:
        raise AuditNoteError("not_found", f"Transaction {transaction_id} not found")

    flags = get_open_flags(db, transaction_id)
    if not flags:
        raise AuditNoteError(
            "no_open_flags",
            f"Transaction {transaction_id} has no open audit flags; nothing to explain",
        )

    query = build_policy_query(flags)
    policies: list[PolicySearchResult] = search_policies(query, top_k=settings.audit_note_policy_top_k)

    user_message = build_user_message(transaction, flags, policies)

    client = get_groq_client()
    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=settings.audit_note_max_tokens,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        tools=[
            {
                "type": "function",
                "function": {
                    "name": _AUDIT_NOTE_TOOL_NAME,
                    "description": "Submit the structured audit note.",
                    "parameters": AuditNoteDraft.model_json_schema(),
                },
            }
        ],
        tool_choice={"type": "function", "function": {"name": _AUDIT_NOTE_TOOL_NAME}},
    )

    message = response.choices[0].message
    if not message.tool_calls:
        raise AuditNoteError(
            "generation_failed",
            f"Groq did not return a usable audit note (finish_reason={response.choices[0].finish_reason})",
        )

    try:
        draft = AuditNoteDraft.model_validate(json.loads(message.tool_calls[0].function.arguments))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise AuditNoteError("generation_failed", f"Groq response failed schema validation: {exc}") from exc

    # Reconcile the structured cited_policy_ids field with any policy_id the
    # model discussed inline in `reasoning` but forgot to also list in the
    # structured field (see _POLICY_ID_MENTION_RE above), then defensively
    # drop anything -- from either source -- that wasn't actually in the
    # retrieved context, in case the model invents an id outright.
    retrieved_ids = {policy.policy_id for policy in policies}
    mentioned_ids = _extract_mentioned_policy_ids(draft.reasoning)
    cited_policy_ids = [pid for pid in draft.cited_policy_ids if pid in retrieved_ids]
    for pid in sorted(mentioned_ids):
        if pid in retrieved_ids and pid not in cited_policy_ids:
            cited_policy_ids.append(pid)
    cited_policies = [policy for policy in policies if policy.policy_id in cited_policy_ids]

    primary_flag = _pick_primary_flag(flags)
    note = AuditNote(
        audit_flag_id=primary_flag.id,
        content=_compose_content(draft),
        status=AuditNoteStatus.DRAFT,
        cited_policy_ids=cited_policy_ids or None,
        created_by_id=created_by_id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return AuditNoteOut(
        id=note.id,
        transaction_id=transaction.id,
        audit_flag_id=note.audit_flag_id,
        status=note.status,
        created_by_id=note.created_by_id,
        summary=draft.summary,
        reasoning=draft.reasoning,
        risk_assessment=draft.risk_assessment,
        recommended_action=draft.recommended_action,
        content=note.content,
        cited_policy_ids=cited_policy_ids,
        cited_policies=cited_policies,
    )
