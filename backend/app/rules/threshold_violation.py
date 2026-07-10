from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.transaction import Transaction
from app.rules.base import RuleFinding

RULE_NAME = "threshold_violation"
RISK_POINTS = 30


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """Flag transactions above a configurable amount threshold (default $10,000)."""
    if transaction.amount <= settings.threshold_violation_amount:
        return None

    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details=(
            f"Amount {transaction.amount} exceeds the threshold of "
            f"{settings.threshold_violation_amount}"
        ),
    )
