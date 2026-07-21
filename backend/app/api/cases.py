from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit_case import AuditCaseOut
from app.schemas.case import CaseSearchRequest, CaseSearchResponse
from app.services.audit_case_service import list_audit_cases
from app.services.case_search import search_cases

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


@router.post("/similar", response_model=CaseSearchResponse)
def search_similar_cases_endpoint(
    payload: CaseSearchRequest,
    current_user: User = Depends(get_current_user),
) -> CaseSearchResponse:
    """Semantic search over resolved historical audit cases (Phase 8's
    retrieve_similar_cases) -- same shape as POST /policies/search. Returns
    a real, honestly empty result today: audit_cases has no rows yet, so
    there's nothing to match against until the case library is seeded and
    scripts/ingest_cases.py has been run."""
    results = search_cases(payload.query, top_k=payload.top_k)
    return CaseSearchResponse(query=payload.query, results=results)
