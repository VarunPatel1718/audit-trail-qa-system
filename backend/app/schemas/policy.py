from pydantic import BaseModel, Field

from app.core.config import settings


class PolicySearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default_factory=lambda: settings.policy_search_default_top_k, ge=1, le=20)


class PolicySearchResult(BaseModel):
    policy_id: int
    score: float
    document_name: str
    title: str
    chapter: str | None
    clause_ref: str | None
    source_page: int | None
    content: str


class PolicySearchResponse(BaseModel):
    query: str
    results: list[PolicySearchResult]
