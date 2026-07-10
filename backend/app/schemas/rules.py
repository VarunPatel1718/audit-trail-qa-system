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
