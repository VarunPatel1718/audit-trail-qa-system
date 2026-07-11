from app.core.config import settings
from app.schemas.policy import PolicySearchResult
from app.services.embeddings import embed_query
from app.vectordb.qdrant_client import get_qdrant_client


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
