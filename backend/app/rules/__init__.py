from app.rules import (
    debit_credit_validation,
    duplicate,
    inactive_vendor,
    missing_approval,
    round_number,
    split_payment,
    threshold_violation,
    vendor_account_mismatch,
    weekend_holiday,
)

# Every rule module here must expose RULE_NAME (str) and
# evaluate(transaction, db) -> RuleFinding | None. Add new rule modules to
# this list as they're implemented.
#
# benfords_law is deliberately NOT here: it's a population-level statistical
# check, not a per-transaction one, and is run separately as part of
# evaluate-all's batch summary instead of contributing to any single
# transaction's risk_score (see app/rules/benfords_law.py).
ACTIVE_RULES = [
    duplicate,
    threshold_violation,
    round_number,
    debit_credit_validation,
    vendor_account_mismatch,
    split_payment,
    weekend_holiday,
    missing_approval,
    inactive_vendor,
]
