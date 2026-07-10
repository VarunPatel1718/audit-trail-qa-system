from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.transaction import Transaction
from app.rules.base import RuleFinding

RULE_NAME = "weekend_holiday"
RISK_POINTS = 10

_SATURDAY = 5


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """Flag transactions posted on a weekend or a configured holiday —
    unusual timing for ordinary business activity."""
    tx_date = transaction.transaction_date.date()
    is_weekend = tx_date.weekday() >= _SATURDAY
    is_holiday = tx_date in settings.holidays

    if not is_weekend and not is_holiday:
        return None

    if is_weekend and is_holiday:
        reason = "a weekend and a configured holiday"
    elif is_weekend:
        reason = "a weekend"
    else:
        reason = "a configured holiday"

    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details=f"Transaction dated {tx_date.isoformat()} falls on {reason}",
    )
