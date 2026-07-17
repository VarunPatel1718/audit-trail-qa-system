from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.policy import PolicySearchRequest, PolicySearchResponse, PolicySearchResult
from app.services.policy_search import get_policies_by_ids, search_policies

router = APIRouter(prefix="/policies", tags=["policies"])


@router.post("/search", response_model=PolicySearchResponse)
def search_policies_endpoint(
    payload: PolicySearchRequest,
    current_user: User = Depends(get_current_user),
) -> PolicySearchResponse:
    results = search_policies(payload.query, top_k=payload.top_k)
    return PolicySearchResponse(query=payload.query, results=results)


@router.get("/by-ids", response_model=list[PolicySearchResult])
def get_policies_by_ids_endpoint(
    ids: str = Query(..., description="Comma-separated policy ids, e.g. ids=2398,2412"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PolicySearchResult]:
    try:
        id_list = [int(part) for part in ids.split(",") if part.strip()]
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ids must be a comma-separated list of integers",
        ) from exc

    if not id_list:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ids must contain at least one policy id",
        )

    return get_policies_by_ids(db, id_list)
