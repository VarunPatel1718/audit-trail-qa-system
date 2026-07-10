from sqlalchemy.orm import Session

from app.models.enums import TransactionStatus
from app.models.transaction import Transaction
from app.rules.base import RuleFinding

RULE_NAME = "missing_approval"
RISK_POINTS = 20

# Statuses that, by definition, imply someone signed off on the transaction.
_APPROVAL_REQUIRED_STATUSES = {TransactionStatus.APPROVED, TransactionStatus.CLEARED}


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """Flag transactions whose status implies approval (approved/cleared) but
    that have no approver on record — a control gap, not just an anomaly."""
    if transaction.status not in _APPROVAL_REQUIRED_STATUSES or transaction.approved_by_id is not None:
        return None

    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details=f"Status is {transaction.status.value} but approved_by_id is missing",
    )
