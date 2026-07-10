from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.transaction import Transaction
from app.rules.base import RuleFinding

RULE_NAME = "duplicate"
RISK_POINTS = 40


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """Flag likely duplicate payments: same vendor, department, and amount,
    posted within a configurable window of each other (default 24h either side)."""
    window = timedelta(hours=settings.duplicate_detection_window_hours)

    matches = db.scalars(
        select(Transaction)
        .where(
            Transaction.id != transaction.id,
            Transaction.vendor_id == transaction.vendor_id,
            Transaction.department_id == transaction.department_id,
            Transaction.amount == transaction.amount,
            Transaction.transaction_date >= transaction.transaction_date - window,
            Transaction.transaction_date <= transaction.transaction_date + window,
        )
        .order_by(Transaction.transaction_date)
        .limit(5)
    ).all()

    if not matches:
        return None

    match_refs = ", ".join(match.transaction_ref for match in matches)
    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details=(
            f"Matches {len(matches)} other transaction(s) on vendor, department, and "
            f"amount ({transaction.amount}) within {settings.duplicate_detection_window_hours}h: "
            f"{match_refs}"
        ),
    )
