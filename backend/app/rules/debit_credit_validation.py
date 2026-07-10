from sqlalchemy.orm import Session

from app.models.enums import DebitCredit
from app.models.transaction import Transaction
from app.rules.base import RuleFinding

RULE_NAME = "debit_credit_mismatch"
RISK_POINTS = 10


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """This ledger only records payments made to vendors, so every entry
    should be a debit (money leaving the organization). A credit against a
    vendor is unusual — a real reversal/rebate, or a miscoded entry — and
    either way is worth an auditor's attention."""
    if transaction.debit_credit == DebitCredit.DEBIT:
        return None

    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details=(
            f"Recorded as {transaction.debit_credit.value} against a vendor payment, "
            "expected debit"
        ),
    )
