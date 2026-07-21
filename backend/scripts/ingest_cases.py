"""Embed audit_cases rows and store them in the 'cases' Qdrant collection for
similar-case RAG retrieval (Phase 8's retrieve_similar_cases).

Unlike ingest_policies.py, there's no chunking step: each audit_cases row is
a single embeddable unit (title + description + resolution concatenated),
not a multi-clause document. Safe to re-run -- clears and recreates the
Qdrant collection from scratch every time, same idempotency pattern as
ingest_policies.py.

audit_cases is currently empty (no case library has ever been seeded -- see
PROGRESS.md), so running this today creates an empty 'cases' collection and
ingests 0 cases. That's the correct, honest behavior, not a bug: rerun once
real cases exist.

Usage (from backend/):
    ./venv/Scripts/python.exe scripts/ingest_cases.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qdrant_client.models import Distance, PointStruct, VectorParams  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.audit_case import AuditCase  # noqa: E402
from app.services.embeddings import embed_passages, get_embedding_model  # noqa: E402
from app.vectordb.qdrant_client import get_qdrant_client  # noqa: E402


def _build_embedding_text(case: AuditCase) -> str:
    return f"{case.title}\n\n{case.description}\n\n{case.resolution}"


def ingest() -> None:
    db = SessionLocal()
    try:
        cases = db.scalars(select(AuditCase)).all()
        print(f"Found {len(cases)} case(s) in audit_cases.")

        vector_size = get_embedding_model().get_embedding_dimension()
        client = get_qdrant_client()
        if client.collection_exists(settings.qdrant_cases_collection):
            client.delete_collection(settings.qdrant_cases_collection)
        client.create_collection(
            collection_name=settings.qdrant_cases_collection,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        print(f"Created Qdrant collection '{settings.qdrant_cases_collection}' (size={vector_size}).")

        if not cases:
            print("0 cases ingested -- audit_cases is empty, nothing to embed yet.")
            return

        embeddings = embed_passages([_build_embedding_text(case) for case in cases])
        points = [
            PointStruct(
                id=case.id,
                vector=embedding,
                payload={
                    "case_id": case.id,
                    "transaction_id": case.transaction_id,
                    "title": case.title,
                    "description": case.description,
                    "resolution": case.resolution,
                    "tags": case.tags,
                },
            )
            for case, embedding in zip(cases, embeddings)
        ]
        client.upsert(collection_name=settings.qdrant_cases_collection, points=points)
        print(f"Upserted {len(points)} case vectors into Qdrant collection '{settings.qdrant_cases_collection}'.")
    finally:
        db.close()


if __name__ == "__main__":
    ingest()
