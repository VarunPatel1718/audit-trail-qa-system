from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.transaction import (
    PaginatedTransactions,
    TransactionDetailOut,
    TransactionFilterParams,
)
from app.services.ledger_service import get_transaction_by_id, search_transactions

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=PaginatedTransactions)
def list_transactions(
    filters: Annotated[TransactionFilterParams, Query()],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedTransactions:
    return search_transactions(db, filters)


@router.get("/{transaction_id}", response_model=TransactionDetailOut)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionDetailOut:
    transaction = get_transaction_by_id(db, transaction_id)

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )

    return TransactionDetailOut.model_validate(transaction)
