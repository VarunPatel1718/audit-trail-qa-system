from dataclasses import dataclass


@dataclass(frozen=True)
class RuleFinding:
    """What a rule module returns when a transaction trips it."""

    rule_name: str
    risk_points: int
    details: str
