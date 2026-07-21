from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit_case import AuditCase
from app.schemas.case import CaseSearchResult
from app.services.embeddings import embed_query
from app.vectordb.qdrant_client import get_qdrant_client


def get_cases_by_ids(db: Session, case_ids: list[int]) -> list[CaseSearchResult]:
    """Direct-by-id case lookup, reading straight from Postgres rather than
    Qdrant -- mirrors get_policies_by_ids() in policy_search.py exactly, same
    reasoning: Qdrant is only needed for semantic search, and `audit_cases`
    already has every field a CaseSearchResult needs. Used to resolve a
    note's stored cited_case_ids back to full case content without
    re-running retrieval. `score` is a fixed 1.0 sentinel (no similarity
    score for a direct id lookup); an id that no longer exists is silently
    skipped rather than failing the whole batch."""
    rows = db.scalars(select(AuditCase).where(AuditCase.id.in_(case_ids))).all()
    by_id = {row.id: row for row in rows}
    return [
        CaseSearchResult(
            case_id=row.id,
            score=1.0,
            transaction_id=row.transaction_id,
            title=row.title,
            description=row.description,
            resolution=row.resolution,
            tags=row.tags,
        )
        for cid in case_ids
        if (row := by_id.get(cid)) is not None
    ]


def search_cases(query: str, top_k: int = 5) -> list[CaseSearchResult]:
    client = get_qdrant_client()

    if not client.collection_exists(settings.qdrant_cases_collection):
        # audit_cases is currently empty and scripts/ingest_cases.py hasn't
        # necessarily been run yet (see PROGRESS.md) -- querying a Qdrant
        # collection that doesn't exist raises a 404, it doesn't return no
        # matches, so that's checked explicitly here rather than letting it
        # propagate as a 500. A genuinely empty result, not a fabricated one.
        return []

    vector = embed_query(query)
    hits = client.query_points(
        collection_name=settings.qdrant_cases_collection,
        query=vector,
        limit=top_k,
    ).points

    return [
        CaseSearchResult(
            case_id=hit.payload["case_id"],
            score=hit.score,
            transaction_id=hit.payload.get("transaction_id"),
            title=hit.payload["title"],
            description=hit.payload["description"],
            resolution=hit.payload["resolution"],
            tags=hit.payload.get("tags"),
        )
        for hit in hits
    ]
