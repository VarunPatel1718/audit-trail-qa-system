from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_flag import AuditFlag
from app.models.enums import FlagStatus, RiskLevel
from app.models.transaction import Transaction
from app.rules import ACTIVE_RULES

# Score bands below the design doc's "100 = Critical" example. Only duplicate
# (40) and threshold_violation (30) exist so far, so a single hit lands in
# MEDIUM and both together (70) lands in HIGH; CRITICAL is reserved for once
# more rules (vendor, weekend, round-number, ...) stack on top.
_RISK_LEVEL_BANDS: list[tuple[int, RiskLevel]] = [
    (75, RiskLevel.CRITICAL),
    (50, RiskLevel.HIGH),
    (25, RiskLevel.MEDIUM),
    (1, RiskLevel.LOW),
]


def risk_level_for_score(score: int) -> RiskLevel | None:
    for band_min, level in _RISK_LEVEL_BANDS:
        if score >= band_min:
            return level
    return None


def evaluate_transaction(transaction: Transaction, db: Session) -> Transaction:
    """Run every active rule against `transaction`, upserting audit_flags and
    recomputing risk_score/risk_level. Safe to call repeatedly: a rule that
    still triggers updates its existing open flag in place rather than piling
    up duplicates, and a rule that stops triggering resolves its old flag."""
    rule_names = [module.RULE_NAME for module in ACTIVE_RULES]
    open_flags_by_rule = {
        flag.rule_name: flag
        for flag in db.scalars(
            select(AuditFlag).where(
                AuditFlag.transaction_id == transaction.id,
                AuditFlag.rule_name.in_(rule_names),
                AuditFlag.status == FlagStatus.OPEN,
            )
        )
    }

    total_score = 0
    triggered_rules: set[str] = set()

    for module in ACTIVE_RULES:
        finding = module.evaluate(transaction, db)
        if finding is None:
            continue

        triggered_rules.add(finding.rule_name)
        total_score += finding.risk_points

        existing_flag = open_flags_by_rule.get(finding.rule_name)
        if existing_flag is not None:
            existing_flag.risk_points = finding.risk_points
            existing_flag.details = finding.details
        else:
            db.add(
                AuditFlag(
                    transaction_id=transaction.id,
                    rule_name=finding.rule_name,
                    risk_points=finding.risk_points,
                    details=finding.details,
                )
            )

    for rule_name, flag in open_flags_by_rule.items():
        if rule_name not in triggered_rules:
            flag.status = FlagStatus.RESOLVED
            flag.resolved_at = datetime.now(timezone.utc)

    transaction.risk_score = total_score
    transaction.risk_level = risk_level_for_score(total_score)
    return transaction
