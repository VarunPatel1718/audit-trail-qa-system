from app.core.config import settings
from app.schemas.case import CaseSearchResult
from app.services.embeddings import embed_query
from app.vectordb.qdrant_client import get_qdrant_client


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
