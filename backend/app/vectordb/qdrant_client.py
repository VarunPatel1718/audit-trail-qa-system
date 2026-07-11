from functools import lru_cache

from qdrant_client import QdrantClient

from app.core.config import settings


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=settings.qdrant_url)
