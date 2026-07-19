from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_case import AuditCase
from app.schemas.audit_case import AuditCaseOut


def list_audit_cases(db: Session) -> list[AuditCaseOut]:
    """Read-only: returns every row in audit_cases, unfiltered. Table is
    currently empty (no case library has been seeded yet), so there's no
    pagination/filtering to build until there's data that needs it."""
    cases = db.scalars(select(AuditCase)).all()
    return [AuditCaseOut.model_validate(case, from_attributes=True) for case in cases]
