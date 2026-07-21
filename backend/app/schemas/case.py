from pydantic import BaseModel, Field


class CaseSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=8, ge=1, le=20)


class CaseSearchResult(BaseModel):
    case_id: int
    score: float
    transaction_id: int | None
    title: str
    description: str
    resolution: str
    tags: str | None


class CaseSearchResponse(BaseModel):
    query: str
    results: list[CaseSearchResult]
