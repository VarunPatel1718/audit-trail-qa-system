from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.rules.base import RuleFinding

RULE_NAME = "round_number"
RISK_POINTS = 5

_ROUND_UNIT = Decimal("100")


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """Flag suspiciously round amounts (exact multiples of $100, which covers
    exact hundreds and thousands) — a classic sign of an estimated rather than
    invoiced figure."""
    if transaction.amount % _ROUND_UNIT != 0:
        return None

    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details=f"Amount {transaction.amount} is an exact multiple of {_ROUND_UNIT}",
    )
