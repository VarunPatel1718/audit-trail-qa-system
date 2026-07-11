from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.policy import PolicySearchRequest, PolicySearchResponse
from app.services.policy_search import search_policies

router = APIRouter(prefix="/policies", tags=["policies"])


@router.post("/search", response_model=PolicySearchResponse)
def search_policies_endpoint(
    payload: PolicySearchRequest,
    current_user: User = Depends(get_current_user),
) -> PolicySearchResponse:
    results = search_policies(payload.query, top_k=payload.top_k)
    return PolicySearchResponse(query=payload.query, results=results)
