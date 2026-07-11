from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit_note import AuditNoteOut
from app.services.audit_note_service import AuditNoteError, generate_audit_note

router = APIRouter(prefix="/transactions", tags=["audit-notes"])

_ERROR_STATUS = {
    "not_found": status.HTTP_404_NOT_FOUND,
    "no_open_flags": status.HTTP_422_UNPROCESSABLE_ENTITY,
    "generation_failed": status.HTTP_502_BAD_GATEWAY,
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
