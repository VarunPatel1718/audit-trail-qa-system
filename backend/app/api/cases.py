from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit_case import AuditCaseOut
from app.services.audit_case_service import list_audit_cases

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=list[AuditCaseOut])
def get_cases_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AuditCaseOut]:
    """Read-only: returns every row in audit_cases. Table is currently empty,
    so this honestly returns an empty list until the case library is
    seeded."""
    return list_audit_cases(db)
