from datetime import datetime
from decimal import Decimal
from math import ceil

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import RiskLevel, TransactionStatus
from app.models.transaction import Transaction
from app.schemas.transaction import (
    PaginatedTransactions,
    SortOrder,
    TransactionFilterParams,
    TransactionOut,
    TransactionSortField,
)

_SORT_COLUMNS = {
    TransactionSortField.TRANSACTION_DATE: Transaction.transaction_date,
    TransactionSortField.AMOUNT: Transaction.amount,
    TransactionSortField.RISK_SCORE: Transaction.risk_score,
    TransactionSortField.CREATED_AT: Transaction.created_at,
}


def apply_transaction_filters(
    stmt: Select,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    vendor_id: int | None = None,
    department_id: int | None = None,
    amount_min: Decimal | None = None,
    amount_max: Decimal | None = None,
    status: TransactionStatus | None = None,
    risk_level: RiskLevel | None = None,
) -> Select:
    """Applies the ledger's standard filter set to a `Transaction` select
    statement. Shared by `search_transactions()` (all 8 filters) and
    `report_service.py` (a smaller subset, for the Reports CSV export) so
    the `.where()` chain isn't duplicated between them."""
    if date_from is not None:
        stmt = stmt.where(Transaction.transaction_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Transaction.transaction_date <= date_to)
    if vendor_id is not None:
        stmt = stmt.where(Transaction.vendor_id == vendor_id)
    if department_id is not None:
        stmt = stmt.where(Transaction.department_id == department_id)
    if amount_min is not None:
        stmt = stmt.where(Transaction.amount >= amount_min)
    if amount_max is not None:
        stmt = stmt.where(Transaction.amount <= amount_max)
    if status is not None:
        stmt = stmt.where(Transaction.status == status)
    if risk_level is not None:
        stmt = stmt.where(Transaction.risk_level == risk_level)
    return stmt


def search_transactions(db: Session, filters: TransactionFilterParams) -> PaginatedTransactions:
    """Filter/sort/paginate transactions. Shared by `GET /transactions` and the
    `query_ledger` MCP tool so both stay behind one implementation."""
    stmt = apply_transaction_filters(
        select(Transaction),
        date_from=filters.date_from,
        date_to=filters.date_to,
        vendor_id=filters.vendor_id,
        department_id=filters.department_id,
        amount_min=filters.amount_min,
        amount_max=filters.amount_max,
        status=filters.status,
        risk_level=filters.risk_level,
    )

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    sort_column = _SORT_COLUMNS[filters.sort_by]
    order = sort_column.asc() if filters.sort_order == SortOrder.ASC else sort_column.desc()
    # Tie-break by id so pagination stays stable across pages when the sort
    # column has duplicate values (e.g. many transactions on the same date).
    stmt = stmt.order_by(order, Transaction.id.desc())

    offset = (filters.page - 1) * filters.page_size
    stmt = stmt.offset(offset).limit(filters.page_size)

    items = db.scalars(stmt).all()

    return PaginatedTransactions(
        items=[TransactionOut.model_validate(item) for item in items],
        total=total,
        page=filters.page,
        page_size=filters.page_size,
        total_pages=ceil(total / filters.page_size) if total else 0,
    )


def get_transaction_by_id(db: Session, transaction_id: int) -> Transaction | None:
    """Fetch one transaction with vendor/department eagerly loaded. Shared by
    `GET /transactions/{id}` and the `risk_score`/`flag_discrepancy` MCP tools."""
    return db.scalars(
        select(Transaction)
        .options(joinedload(Transaction.vendor), joinedload(Transaction.department))
        .where(Transaction.id == transaction_id)
    ).first()
