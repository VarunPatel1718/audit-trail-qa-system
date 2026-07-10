from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.vendor import Vendor
from app.rules.base import RuleFinding

RULE_NAME = "vendor_account_mismatch"
RISK_POINTS = 15


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """Flag payments sent to an account number that doesn't match the vendor's
    known bank account — a common sign of a compromised or fraudulent payee."""
    if not transaction.account_number:
        return None

    vendor_account = db.scalar(
        select(Vendor.bank_account_number).where(Vendor.id == transaction.vendor_id)
    )
    if not vendor_account or transaction.account_number == vendor_account:
        return None

    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details=(
            f"Transaction account_number {transaction.account_number} does not match "
            f"the vendor's known account {vendor_account}"
        ),
    )
