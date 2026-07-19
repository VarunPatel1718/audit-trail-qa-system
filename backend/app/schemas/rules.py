from pydantic import BaseModel, ConfigDict

from app.models.enums import FlagStatus, RiskLevel


class AuditFlagOut(BaseModel):
    id: int
    rule_name: str
    risk_points: int
    details: str | None
    status: FlagStatus

    model_config = ConfigDict(from_attributes=True)


class TransactionEvaluationOut(BaseModel):
    transaction_id: int
    transaction_ref: str
    risk_score: int
    risk_level: RiskLevel | None
    flags: list[AuditFlagOut]


class TransactionFlagsOut(BaseModel):
    """Read-only counterpart to TransactionEvaluationOut -- same shape, but
    served from whatever's already in the DB instead of re-running the rule
    engine. `evaluated` distinguishes "never evaluated" from "evaluated and
    found nothing" -- both currently look identical on the transaction row
    itself (risk_score=0, no open flags), since there's no evaluated_at
    column; this is approximated as "has this transaction ever had any
    audit_flags row at all, open or resolved."""

    transaction_id: int
    transaction_ref: str
    risk_score: int
    risk_level: RiskLevel | None
    evaluated: bool
    flags: list[AuditFlagOut]


class BenfordsLawOut(BaseModel):
    sample_size: int
    observed_frequencies: dict[int, float]
    expected_frequencies: dict[int, float]
    chi_square_statistic: float
    is_significant: bool
    details: str

    model_config = ConfigDict(from_attributes=True)


class BatchEvaluationOut(BaseModel):
    evaluated_count: int
    flagged_count: int
    risk_level_counts: dict[str, int]
    benfords_law: BenfordsLawOut | None


class ActiveRulesOut(BaseModel):
    count: int
    rules: list[str]
