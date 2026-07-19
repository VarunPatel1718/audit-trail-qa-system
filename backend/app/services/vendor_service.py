from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vendor import Vendor
from app.schemas.transaction import VendorSummary


def list_vendors(db: Session) -> list[VendorSummary]:
    """Read-only: returns every vendor, unfiltered -- 17 rows, no
    pagination/filtering logic needed yet."""
    vendors = db.scalars(select(Vendor).order_by(Vendor.id)).all()
    return [VendorSummary.model_validate(v) for v in vendors]


def get_vendor_by_id(db: Session, vendor_id: int) -> Vendor | None:
    return db.scalars(select(Vendor).where(Vendor.id == vendor_id)).first()


def set_vendor_active(db: Session, vendor_id: int, is_active: bool) -> Vendor | None:
    """Updates a vendor's `is_active` flag. Returns None if the vendor
    doesn't exist -- doesn't retroactively touch any transaction's already
    -computed `risk_score`/`risk_level`; the `inactive_vendor` rule
    (app/rules/inactive_vendor.py) reads `Vendor.is_active` fresh on every
    call, so this change only takes effect the next time a transaction for
    this vendor is (re-)evaluated."""
    vendor = get_vendor_by_id(db, vendor_id)
    if vendor is None:
        return None
    vendor.is_active = is_active
    db.commit()
    db.refresh(vendor)
    return vendor
