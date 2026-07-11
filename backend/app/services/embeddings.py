from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.config import settings

# BGE models are trained so that retrieval queries are prefixed with this
# instruction; passages/corpus text is embedded as-is with no prefix.
_BGE_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model_name)


def embed_passages(texts: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(text: str) -> list[float]:
    model = get_embedding_model()
    embedding = model.encode(
        _BGE_QUERY_INSTRUCTION + text, normalize_embeddings=True, show_progress_bar=False
    )
    return embedding.tolist()
