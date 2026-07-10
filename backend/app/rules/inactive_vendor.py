from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.vendor import Vendor
from app.rules.base import RuleFinding

RULE_NAME = "inactive_vendor"
RISK_POINTS = 20


def evaluate(transaction: Transaction, db: Session) -> RuleFinding | None:
    """Flag payments to a vendor marked inactive — could be a stale
    relationship that should've been blocked, or a ghost-vendor scheme."""
    is_active = db.scalar(select(Vendor.is_active).where(Vendor.id == transaction.vendor_id))
    if is_active is not False:
        return None

    return RuleFinding(
        rule_name=RULE_NAME,
        risk_points=RISK_POINTS,
        details="Vendor is marked inactive",
    )
