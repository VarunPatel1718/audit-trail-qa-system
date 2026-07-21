"""MCP server exposing the audit trail system's internal services as tools.

Each tool wraps the same service-layer functions the FastAPI routes use
(`app/services/*.py`) rather than reimplementing their logic. Run directly for
stdio transport (e.g. from an MCP host's config):

    ./venv/Scripts/python.exe -m app.mcp.server

MCP tools have no HTTP request/Authorization header to check, so -- unlike the
FastAPI routes -- they don't go through `get_current_user`. The MCP host
process itself is the trust boundary here (matches how local MCP servers are
normally run: spawned directly by a trusted client, not exposed over the
network).
"""

from pydantic import ValidationError

from mcp.server.fastmcp import FastMCP

from app.db.session import SessionLocal
from app.schemas.reports import ReportFilterParams
from app.schemas.rules import AuditFlagOut
from app.schemas.transaction import TransactionFilterParams
from app.services.audit_note_service import AuditNoteError, generate_audit_note as generate_audit_note_service
from app.services.case_search import search_cases
from app.services.ledger_service import get_transaction_by_id, search_transactions
from app.services.policy_search import search_policies
from app.services.report_service import get_flagged_transactions_report
from app.services.risk_scoring import create_manual_flag, get_open_flags

mcp = FastMCP("audit-trail-qa-system")


@mcp.tool()
def query_ledger(
    date_from: str | None = None,
    date_to: str | None = None,
    vendor_id: int | None = None,
    department_id: int | None = None,
    amount_min: float | None = None,
    amount_max: float | None = None,
    status: str | None = None,
    risk_level: str | None = None,
    sort_by: str = "transaction_date",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 25,
) -> dict:
    """Search/filter/sort the transaction ledger.

    status: pending, approved, rejected, flagged, or cleared.
    risk_level: low, medium, high, or critical.
    sort_by: transaction_date, amount, risk_score, or created_at.
    sort_order: asc or desc.
    """
    try:
        filters = TransactionFilterParams(
            date_from=date_from,
            date_to=date_to,
            vendor_id=vendor_id,
            department_id=department_id,
            amount_min=amount_min,
            amount_max=amount_max,
            status=status,
            risk_level=risk_level,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )
    except ValidationError as exc:
        return {"error": "invalid_filters", "details": exc.errors()}

    with SessionLocal() as db:
        result = search_transactions(db, filters)
        return result.model_dump(mode="json")


@mcp.tool()
def flag_discrepancy(transaction_id: int, reason: str) -> dict:
    """Manually flag a transaction for review with a free-text reason.

    Distinct from the automated rule engine: this records an auditor's own
    observation and never gets auto-resolved by re-running the rule engine.
    """
    with SessionLocal() as db:
        transaction = get_transaction_by_id(db, transaction_id)
        if transaction is None:
            return {"error": "not_found", "message": f"Transaction {transaction_id} not found"}

        flag = create_manual_flag(db, transaction, reason)
        db.commit()
        db.refresh(flag)
        return AuditFlagOut.model_validate(flag).model_dump(mode="json")


@mcp.tool()
def generate_audit_note(transaction_id: int) -> dict:
    """Draft an explainable, structured audit note for a flagged transaction.

    Retrieves the transaction's open rule-engine findings and relevant policy
    clauses, asks Claude to draft a grounded audit note (summary, reasoning,
    risk assessment, recommended action, cited policy clauses), and persists
    it as a DRAFT `audit_notes` row. Fails with an error dict if the
    transaction has no open flags -- there is nothing to explain.
    """
    with SessionLocal() as db:
        try:
            note = generate_audit_note_service(db, transaction_id)
        except AuditNoteError as exc:
            return {"error": exc.code, "message": exc.message}
        return note.model_dump(mode="json")


@mcp.tool()
def retrieve_policy(query: str, top_k: int = 8) -> dict:
    """Semantic search over ingested accounting/compliance policy documents,
    returning the top-k most relevant clauses with their source document and
    clause reference."""
    results = search_policies(query, top_k=top_k)
    return {
        "query": query,
        "results": [r.model_dump(mode="json") for r in results],
    }


@mcp.tool()
def retrieve_similar_cases(query: str, top_k: int = 8) -> dict:
    """Semantic search over resolved historical audit cases, returning the
    top-k most similar past cases (title, description, resolution). No
    cases have been seeded/ingested yet, so this currently always returns
    an empty results list -- not an error -- until the case library exists
    and scripts/ingest_cases.py has been run."""
    results = search_cases(query, top_k=top_k)
    return {
        "query": query,
        "results": [r.model_dump(mode="json") for r in results],
    }


@mcp.tool()
def risk_score(transaction_id: int) -> dict:
    """Return a transaction's current risk score/level and open audit flags
    (as already computed by the rule engine -- does not re-run the rules)."""
    with SessionLocal() as db:
        transaction = get_transaction_by_id(db, transaction_id)
        if transaction is None:
            return {"error": "not_found", "message": f"Transaction {transaction_id} not found"}

        flags = get_open_flags(db, transaction.id)
        return {
            "transaction_id": transaction.id,
            "transaction_ref": transaction.transaction_ref,
            "risk_score": transaction.risk_score,
            "risk_level": transaction.risk_level.value if transaction.risk_level else None,
            "open_flags": [AuditFlagOut.model_validate(flag).model_dump(mode="json") for flag in flags],
        }


@mcp.tool()
def export_report(
    date_from: str | None = None,
    date_to: str | None = None,
    department_id: int | None = None,
    status: str | None = None,
    risk_level: str | None = None,
) -> dict:
    """Export flagged/audited transactions (risk_level medium, high, or
    critical) as structured rows -- vendor/department names, amount,
    risk_score/risk_level, and the latest audit note's status if one exists
    (draft/submitted/approved/rejected, or "no note"). Same data
    `GET /reports/export` streams as CSV, returned here as JSON rows instead
    since MCP tool results are structured data, not a file download.
    """
    try:
        filters = ReportFilterParams(
            date_from=date_from,
            date_to=date_to,
            department_id=department_id,
            status=status,
            risk_level=risk_level,
        )
    except ValidationError as exc:
        return {"error": "invalid_filters", "details": exc.errors()}

    with SessionLocal() as db:
        rows = get_flagged_transactions_report(db, filters)
        return {"count": len(rows), "rows": rows}


if __name__ == "__main__":
    mcp.run()
