"""Chunk the accounting policy PDFs in documents/policies/, embed each chunk, and
store them in Postgres (`policies` table) + Qdrant (`policies` collection) for RAG retrieval.

Re-running fully re-ingests: clears existing `policies` rows and recreates the
Qdrant collection from scratch, so this script is safe to run repeatedly as
policy documents are added/updated.

Usage (from backend/):
    ./venv/Scripts/python.exe scripts/ingest_policies.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qdrant_client.models import Distance, PointStruct, VectorParams  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.policy import Policy  # noqa: E402
from app.services.embeddings import embed_passages, get_embedding_model  # noqa: E402
from app.services.policy_chunking import chunk_policy_pdf  # noqa: E402
from app.vectordb.qdrant_client import get_qdrant_client  # noqa: E402

POLICIES_DIR = Path(__file__).resolve().parents[2] / "documents" / "policies"

# Filename -> human-readable document title (used as Policy.title for every
# chunk from that PDF).
DOCUMENT_TITLES = {
    "md_fraud_risk_nbfc_2024.pdf": (
        "Master Directions on Fraud Risk Management in Non-Banking Financial "
        "Companies (NBFCs) (including Housing Finance Companies), 2024"
    ),
    "md_fraud_risk_commercial_banks_2024.pdf": (
        "Master Directions on Fraud Risk Management in Commercial Banks "
        "(including Regional Rural Banks) and All India Financial Institutions, 2024"
    ),
    "md_kyc_2016.pdf": "Master Direction - Know Your Customer (KYC) Direction, 2016",
}
DOCUMENT_VERSIONS = {
    "md_fraud_risk_nbfc_2024.pdf": "2024",
    "md_fraud_risk_commercial_banks_2024.pdf": "2024",
    "md_kyc_2016.pdf": "2016",
}


def _parent_clause_ref(clause_ref: str) -> str | None:
    if "." not in clause_ref:
        return None
    return clause_ref.rsplit(".", 1)[0]


def _build_embedding_texts(policies: list[Policy]) -> list[str]:
    """Prepend ancestor-clause heading text to each chunk before embedding.

    A deeply nested clause (e.g. "6.2.1") is often just an operative sentence
    with no topical vocabulary of its own ("furnish FMR ... 14 days"), while
    its parent clauses carry the section's subject ("6.2 Modalities of
    Reporting Incidents of Fraud to RBI"). Without that context, embedding
    the clause alone ranks poorly against queries phrased around the
    section's topic instead of the clause's exact wording. The stored/
    returned `content` is left untouched; this text is only fed to the
    embedding model.
    """
    by_ref: dict[tuple[str, str], Policy] = {
        (p.document_name, p.clause_ref): p for p in policies if p.clause_ref
    }

    texts: list[str] = []
    for policy in policies:
        if not policy.clause_ref:
            texts.append(policy.content)
            continue

        breadcrumbs: list[str] = []
        seen: set[str] = set()
        ref = _parent_clause_ref(policy.clause_ref)
        while ref and ref not in seen and (policy.document_name, ref) in by_ref:
            seen.add(ref)
            breadcrumbs.append(by_ref[(policy.document_name, ref)].content)
            ref = _parent_clause_ref(ref)
        breadcrumbs.reverse()

        text = " ".join([*breadcrumbs, policy.content])
        if policy.chapter:
            text = f"{policy.chapter}. {text}"
        texts.append(text)
    return texts


def ingest() -> None:
    pdf_paths = sorted(POLICIES_DIR.glob("*.pdf"))
    if not pdf_paths:
        print(f"No PDFs found in {POLICIES_DIR}")
        return

    db = SessionLocal()
    try:
        deleted = db.query(Policy).delete()
        db.commit()
        print(f"Cleared {deleted} existing policy chunks.")

        all_policies: list[Policy] = []
        for pdf_path in pdf_paths:
            title = DOCUMENT_TITLES.get(pdf_path.name, pdf_path.stem)
            version = DOCUMENT_VERSIONS.get(pdf_path.name)
            chunks = chunk_policy_pdf(pdf_path, document_title=title)
            print(f"{pdf_path.name}: extracted {len(chunks)} clause chunks")

            for chunk in chunks:
                policy = Policy(
                    title=chunk.title,
                    document_name=chunk.document_name,
                    content=chunk.content,
                    version=version,
                    source_page=chunk.source_page,
                    chapter=chunk.chapter,
                    clause_ref=chunk.clause_ref,
                )
                db.add(policy)
                all_policies.append(policy)

        db.commit()
        for policy in all_policies:
            db.refresh(policy)

        print(f"Inserted {len(all_policies)} policy chunks into Postgres.")

        print(f"Embedding {len(all_policies)} chunks with {settings.embedding_model_name} ...")
        embeddings = embed_passages(_build_embedding_texts(all_policies))
        vector_size = get_embedding_model().get_embedding_dimension()

        client = get_qdrant_client()
        if client.collection_exists(settings.qdrant_policies_collection):
            client.delete_collection(settings.qdrant_policies_collection)
        client.create_collection(
            collection_name=settings.qdrant_policies_collection,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )

        points = [
            PointStruct(
                id=policy.id,
                vector=embedding,
                payload={
                    "policy_id": policy.id,
                    "document_name": policy.document_name,
                    "title": policy.title,
                    "chapter": policy.chapter,
                    "clause_ref": policy.clause_ref,
                    "source_page": policy.source_page,
                    "content": policy.content,
                },
            )
            for policy, embedding in zip(all_policies, embeddings)
        ]
        client.upsert(collection_name=settings.qdrant_policies_collection, points=points)
        print(f"Upserted {len(points)} vectors into Qdrant collection '{settings.qdrant_policies_collection}'.")
    finally:
        db.close()


if __name__ == "__main__":
    ingest()
