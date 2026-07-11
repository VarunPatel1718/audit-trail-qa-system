from math import ceil

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

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


def search_transactions(db: Session, filters: TransactionFilterParams) -> PaginatedTransactions:
    """Filter/sort/paginate transactions. Shared by `GET /transactions` and the
    `query_ledger` MCP tool so both stay behind one implementation."""
    stmt = select(Transaction)

    if filters.date_from is not None:
        stmt = stmt.where(Transaction.transaction_date >= filters.date_from)
    if filters.date_to is not None:
        stmt = stmt.where(Transaction.transaction_date <= filters.date_to)
    if filters.vendor_id is not None:
        stmt = stmt.where(Transaction.vendor_id == filters.vendor_id)
    if filters.department_id is not None:
        stmt = stmt.where(Transaction.department_id == filters.department_id)
    if filters.amount_min is not None:
        stmt = stmt.where(Transaction.amount >= filters.amount_min)
    if filters.amount_max is not None:
        stmt = stmt.where(Transaction.amount <= filters.amount_max)
    if filters.status is not None:
        stmt = stmt.where(Transaction.status == filters.status)
    if filters.risk_level is not None:
        stmt = stmt.where(Transaction.risk_level == filters.risk_level)

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
