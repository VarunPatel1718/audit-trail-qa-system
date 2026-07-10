"""Benford's Law leading-digit analysis.

Unlike the other rule modules, this is a population-level statistical check,
not a per-transaction one: no single transaction "violates" Benford's Law,
only a large-enough sample of them can collectively deviate from the expected
leading-digit distribution. So this module doesn't implement the
RULE_NAME/evaluate(transaction, db) interface the other rules share and isn't
listed in ACTIVE_RULES — it's run once per evaluate-all batch over the whole
evaluated set and reported as a separate aggregate result, not turned into
audit_flags or added to any individual transaction's risk_score.
"""

import math
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal

from app.models.transaction import Transaction

RULE_NAME = "benfords_law"

# Benford's Law needs a reasonably large, naturally-occurring sample to be
# statistically meaningful; below this, deviation is expected by chance alone.
MIN_SAMPLE_SIZE = 50

EXPECTED_DIGIT_FREQUENCIES: dict[int, float] = {d: math.log10(1 + 1 / d) for d in range(1, 10)}

# Chi-square critical value for 8 degrees of freedom (9 digits - 1) at p=0.05.
_CHI_SQUARE_CRITICAL_VALUE = 15.507


@dataclass(frozen=True)
class BenfordsLawResult:
    sample_size: int
    observed_frequencies: dict[int, float]
    expected_frequencies: dict[int, float]
    chi_square_statistic: float
    is_significant: bool
    details: str


def _leading_digit(amount: Decimal) -> int | None:
    for char in format(abs(amount), "f"):
        if char.isdigit() and char != "0":
            return int(char)
        if char.isdigit():  # a leading zero (e.g. "0.53") — keep scanning
            continue
    return None


def analyze(transactions: list[Transaction]) -> BenfordsLawResult | None:
    """Returns None if there aren't enough transactions for the chi-square
    test to be meaningful."""
    digits = [digit for t in transactions if (digit := _leading_digit(t.amount)) is not None]
    sample_size = len(digits)

    if sample_size < MIN_SAMPLE_SIZE:
        return None

    counts = Counter(digits)
    observed_frequencies = {d: counts.get(d, 0) / sample_size for d in range(1, 10)}

    chi_square = sum(
        (counts.get(d, 0) - EXPECTED_DIGIT_FREQUENCIES[d] * sample_size) ** 2
        / (EXPECTED_DIGIT_FREQUENCIES[d] * sample_size)
        for d in range(1, 10)
    )
    is_significant = chi_square > _CHI_SQUARE_CRITICAL_VALUE

    return BenfordsLawResult(
        sample_size=sample_size,
        observed_frequencies=observed_frequencies,
        expected_frequencies=EXPECTED_DIGIT_FREQUENCIES,
        chi_square_statistic=chi_square,
        is_significant=is_significant,
        details=(
            f"chi-square={chi_square:.2f} over {sample_size} transactions "
            f"({'significant deviation from Benford distribution' if is_significant else 'consistent with Benford distribution'})"
        ),
    )
