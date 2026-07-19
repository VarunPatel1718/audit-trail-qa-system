import csv
import io
from collections.abc import Iterator

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.audit_flag import AuditFlag
from app.models.audit_note import AuditNote
from app.models.enums import RiskLevel
from app.models.transaction import Transaction
from app.schemas.reports import ReportFilterParams
from app.services.ledger_service import apply_transaction_filters

# A report surfaces transactions currently at meaningful risk, not every
# transaction that ever triggered a rule. risk_level is denormalized from
# currently-open flags (see risk_scoring.evaluate_transaction): a transaction
# whose only flag was later resolved already reads risk_level=None, while
# "has any audit_flags row at all" would resurface stale, already-resolved
# findings the rule engine no longer considers relevant. Confirmed against
# the live seeded data before choosing this (see PROGRESS.md decisions log).
REPORTABLE_RISK_LEVELS = (RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL)

CSV_FIELDNAMES = [
    "transaction_id",
    "transaction_ref",
    "transaction_date",
    "vendor",
    "department",
    "amount",
    "currency",
    "risk_score",
    "risk_level",
    "audit_note_status",
]


def get_flagged_transactions_report(db: Session, filters: ReportFilterParams) -> list[dict]:
    """Flagged/audited transactions (risk_level medium/high/critical) with
    vendor/department names and the latest audit note's status, if any.
    Shared by `GET /reports/export` and the `export_report` MCP tool so both
    stay behind one implementation."""
    stmt = (
        select(Transaction)
        .options(joinedload(Transaction.vendor), joinedload(Transaction.department))
        .where(Transaction.risk_level.in_(REPORTABLE_RISK_LEVELS))
    )
    stmt = apply_transaction_filters(
        stmt,
        date_from=filters.date_from,
        date_to=filters.date_to,
        department_id=filters.department_id,
        status=filters.status,
        risk_level=filters.risk_level,
    )
    stmt = stmt.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())

    transactions = db.scalars(stmt).unique().all()
    if not transactions:
        return []

    transaction_ids = [t.id for t in transactions]
    latest_note_status = _latest_note_status_by_transaction(db, transaction_ids)

    return [
        {
            "transaction_id": t.id,
            "transaction_ref": t.transaction_ref,
            "transaction_date": t.transaction_date.isoformat(),
            "vendor": t.vendor.name,
            "department": t.department.name,
            "amount": str(t.amount),
            "currency": t.currency,
            "risk_score": t.risk_score,
            "risk_level": t.risk_level.value if t.risk_level else "",
            "audit_note_status": latest_note_status.get(t.id, "no note"),
        }
        for t in transactions
    ]


def _latest_note_status_by_transaction(db: Session, transaction_ids: list[int]) -> dict[int, str]:
    """Most recent audit note's status per transaction id, keyed off
    `AuditFlag.transaction_id` since `AuditNote` only FKs to a flag, not a
    transaction directly (same join `audit_note_service.get_latest_audit_note()`
    uses). Selects `AuditFlag.transaction_id` alongside each note explicitly,
    rather than reading `note.audit_flag.transaction_id` off the ORM
    relationship, to avoid one lazy-load query per note."""
    rows = db.execute(
        select(AuditNote, AuditFlag.transaction_id)
        .join(AuditFlag, AuditNote.audit_flag_id == AuditFlag.id)
        .where(AuditFlag.transaction_id.in_(transaction_ids))
        .order_by(AuditNote.created_at.desc(), AuditNote.id.desc())
    ).all()

    latest: dict[int, str] = {}
    for note, transaction_id in rows:
        latest.setdefault(transaction_id, note.status.value)
    return latest


def rows_to_csv_stream(rows: list[dict]) -> Iterator[str]:
    """Serializes already-fetched report rows to CSV text in chunks, for
    `StreamingResponse`. Takes plain rows rather than a live query/session so
    the DB session can close as soon as the endpoint returns -- a generator
    that queried the DB itself wouldn't run its body (including the query)
    until first iterated, which happens during response streaming, after
    FastAPI has already closed the `Depends(get_db)` session."""
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_FIELDNAMES)

    writer.writeheader()
    yield buffer.getvalue()

    for row in rows:
        buffer.seek(0)
        buffer.truncate(0)
        writer.writerow(row)
        yield buffer.getvalue()
