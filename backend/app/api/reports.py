from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.reports import ReportFilterParams
from app.services.report_service import get_flagged_transactions_report, rows_to_csv_stream

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/export")
def export_report_csv(
    filters: Annotated[ReportFilterParams, Query()],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Read-only: streams flagged/audited transactions (risk_level
    medium/high/critical) as a downloadable CSV. Open to any authenticated
    role, matching the Ledger/rule-engine/policies precedent that viewing
    isn't role-restricted."""
    rows = get_flagged_transactions_report(db, filters)
    filename = f"audit_report_{date.today().isoformat()}.csv"
    return StreamingResponse(
        rows_to_csv_stream(rows),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
