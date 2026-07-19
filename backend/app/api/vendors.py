from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.transaction import VendorSummary, VendorUpdate
from app.services.vendor_service import list_vendors, set_vendor_active

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorSummary])
def list_vendors_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[VendorSummary]:
    """Read-only: returns every vendor. Open to any authenticated role,
    matching the precedent every other read endpoint in this codebase
    follows."""
    return list_vendors(db)


@router.patch("/{vendor_id}", response_model=VendorSummary)
def update_vendor_active_endpoint(
    vendor_id: int,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
) -> VendorSummary:
    """Admin-only: toggles a vendor's `is_active` flag. Affects the
    `inactive_vendor` rule on the *next* evaluation of that vendor's
    transactions, not retroactively (see `set_vendor_active()`)."""
    vendor = set_vendor_active(db, vendor_id, payload.is_active)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return VendorSummary.model_validate(vendor)
