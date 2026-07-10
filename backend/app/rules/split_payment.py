from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.transaction import Transaction
from app.rules.base import RuleFinding

RULE_NAME = "split_payment"
RISK_POINTS = 35


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """Flag structuring: several transactions to the same vendor, each
    individually under the approval threshold, that together sum to at or
    above it within a short time window."""
    window = timedelta(hours=settings.split_payment_window_hours)

    group = db.scalars(
        select(Transaction)
        .where(
            Transaction.vendor_id == transaction.vendor_id,
            Transaction.transaction_date >= transaction.transaction_date - window,
            Transaction.transaction_date <= transaction.transaction_date + window,
        )
        .order_by(Transaction.transaction_date)
    ).all()

    if len(group) < settings.split_payment_min_count:
        return None

    if any(t.amount >= settings.threshold_violation_amount for t in group):
        # A member already exceeds the threshold on its own — that's a
        # threshold_violation, not evidence of structuring to avoid one.
        return None

    total = sum((t.amount for t in group), Decimal("0"))
    if total < settings.threshold_violation_amount:
        return None

    refs = ", ".join(t.transaction_ref for t in group)
    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details=(
            f"{len(group)} transactions to this vendor within "
            f"{settings.split_payment_window_hours}h sum to {total}, at/above the "
            f"{settings.threshold_violation_amount} threshold while each stays under it: {refs}"
        ),
    )
