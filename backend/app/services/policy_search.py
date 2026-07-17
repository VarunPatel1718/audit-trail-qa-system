from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.policy import Policy
from app.schemas.policy import PolicySearchResult
from app.services.embeddings import embed_query
from app.vectordb.qdrant_client import get_qdrant_client


def get_policies_by_ids(db: Session, policy_ids: list[int]) -> list[PolicySearchResult]:
    """Direct-by-id policy lookup, reading straight from Postgres rather than
    Qdrant -- Qdrant is only needed for semantic search, and the `policies`
    table already has every field a PolicySearchResult needs. Used to
    resolve a note's stored cited_policy_ids back to full clause text
    without re-running retrieval (GET /policies/by-ids,
    GET /transactions/{id}/audit-note). `score` is a fixed 1.0 sentinel
    (there's no similarity score for a direct id lookup); order follows the
    caller's requested id order, and an id that no longer exists is silently
    skipped rather than failing the whole batch."""
    rows = db.scalars(select(Policy).where(Policy.id.in_(policy_ids))).all()
    by_id = {row.id: row for row in rows}
    return [
        PolicySearchResult(
            policy_id=row.id,
            score=1.0,
            document_name=row.document_name,
            title=row.title,
            chapter=row.chapter,
            clause_ref=row.clause_ref,
            source_page=row.source_page,
            content=row.content,
        )
        for pid in policy_ids
        if (row := by_id.get(pid)) is not None
    ]


def search_policies(query: str, top_k: int = 5) -> list[PolicySearchResult]:
    vector = embed_query(query)
    client = get_qdrant_client()
    hits = client.query_points(
        collection_name=settings.qdrant_policies_collection,
        query=vector,
        limit=top_k,
    ).points

    return [
        PolicySearchResult(
            policy_id=hit.payload["policy_id"],
            score=hit.score,
            document_name=hit.payload["document_name"],
            title=hit.payload["title"],
            chapter=hit.payload.get("chapter"),
            clause_ref=hit.payload.get("clause_ref"),
            source_page=hit.payload.get("source_page"),
            content=hit.payload["content"],
        )
        for hit in hits
    ]
