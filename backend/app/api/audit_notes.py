from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.db.session import get_db
from app.models.enums import AuditNoteStatus
from app.models.user import User
from app.schemas.audit_note import AuditNoteOut, RejectAuditNoteRequest
from app.services.audit_note_service import (
    AuditNoteError,
    approve_note,
    generate_audit_note,
    get_latest_audit_note,
    reject_note,
    search_audit_notes,
    submit_for_review,
)

router = APIRouter(prefix="/transactions", tags=["audit-notes"])
review_router = APIRouter(prefix="/audit-notes", tags=["audit-notes"])

_ERROR_STATUS = {
    "not_found": status.HTTP_404_NOT_FOUND,
    "no_open_flags": status.HTTP_422_UNPROCESSABLE_ENTITY,
    "generation_failed": status.HTTP_502_BAD_GATEWAY,
    "invalid_transition": status.HTTP_409_CONFLICT,
    "draft_already_exists": status.HTTP_409_CONFLICT,
}


@router.post("/{transaction_id}/generate-audit-note", response_model=AuditNoteOut)
def generate_audit_note_endpoint(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditNoteOut:
    try:
        return generate_audit_note(db, transaction_id, created_by_id=current_user.id)
    except AuditNoteError as exc:
        raise HTTPException(
            status_code=_ERROR_STATUS.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR),
            detail=exc.message,
        ) from exc


@router.get("/{transaction_id}/audit-note", response_model=AuditNoteOut)
def get_audit_note_endpoint(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditNoteOut:
    """Read-only: returns the most recently generated note for this
    transaction if one exists. Never calls Groq and never writes anything --
    lets the frontend check "does a note already exist" before deciding
    whether to show a Generate button."""
    note = get_latest_audit_note(db, transaction_id)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No audit note found for this transaction",
        )
    return note


@review_router.get("", response_model=list[AuditNoteOut])
def list_audit_notes_endpoint(
    status: AuditNoteStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AuditNoteOut]:
    """Read-only: lists audit notes, optionally filtered by status. Open to
    any authenticated role -- viewing isn't restricted, only the workflow
    transitions (submit/approve/reject) below are."""
    return search_audit_notes(db, status)


@review_router.post("/{note_id}/submit", response_model=AuditNoteOut)
def submit_audit_note_endpoint(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Auditor", "Admin")),
) -> AuditNoteOut:
    try:
        return submit_for_review(db, note_id, current_user)
    except AuditNoteError as exc:
        raise HTTPException(
            status_code=_ERROR_STATUS.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR),
            detail=exc.message,
        ) from exc


@review_router.post("/{note_id}/approve", response_model=AuditNoteOut)
def approve_audit_note_endpoint(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Finance Manager", "Admin")),
) -> AuditNoteOut:
    try:
        return approve_note(db, note_id, current_user)
    except AuditNoteError as exc:
        raise HTTPException(
            status_code=_ERROR_STATUS.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR),
            detail=exc.message,
        ) from exc


@review_router.post("/{note_id}/reject", response_model=AuditNoteOut)
def reject_audit_note_endpoint(
    note_id: int,
    payload: RejectAuditNoteRequest = RejectAuditNoteRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Finance Manager", "Admin")),
) -> AuditNoteOut:
    try:
        return reject_note(db, note_id, current_user, payload.reason)
    except AuditNoteError as exc:
        raise HTTPException(
            status_code=_ERROR_STATUS.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR),
            detail=exc.message,
        ) from exc
