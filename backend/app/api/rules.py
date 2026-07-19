from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.rules import ACTIVE_RULES
from app.schemas.rules import ActiveRulesOut

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("", response_model=ActiveRulesOut)
def list_active_rules_endpoint(
    current_user: User = Depends(get_current_user),
) -> ActiveRulesOut:
    """Read-only: the currently active rule-engine modules (app/rules/
    __init__.py's ACTIVE_RULES), for an Admin Panel system-overview count.
    Not DB-backed -- no service layer needed, this just reflects the
    hardcoded registry directly."""
    return ActiveRulesOut(
        count=len(ACTIVE_RULES),
        rules=[module.RULE_NAME for module in ACTIVE_RULES],
    )
