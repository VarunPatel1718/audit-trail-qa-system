from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    PaginatedTransactions,
    SortOrder,
    TransactionDetailOut,
    TransactionFilterParams,
    TransactionOut,
    TransactionSortField,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])

_SORT_COLUMNS = {
    TransactionSortField.TRANSACTION_DATE: Transaction.transaction_date,
    TransactionSortField.AMOUNT: Transaction.amount,
    TransactionSortField.RISK_SCORE: Transaction.risk_score,
    TransactionSortField.CREATED_AT: Transaction.created_at,
}


@router.get("", response_model=PaginatedTransactions)
def list_transactions(
    filters: Annotated[TransactionFilterParams, Query()],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedTransactions:
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


@router.get("/{transaction_id}", response_model=TransactionDetailOut)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionDetailOut:
    transaction = db.scalars(
        select(Transaction)
        .options(joinedload(Transaction.vendor), joinedload(Transaction.department))
        .where(Transaction.id == transaction_id)
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )

    return TransactionDetailOut.model_validate(transaction)
