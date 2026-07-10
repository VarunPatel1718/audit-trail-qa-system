from app.rules import duplicate, threshold_violation

# Every rule module here must expose RULE_NAME (str) and
# evaluate(transaction, db) -> RuleFinding | None. Add new rule modules to
# this list as they're implemented (round-number, vendor-account pairing, etc).
ACTIVE_RULES = [duplicate, threshold_violation]
