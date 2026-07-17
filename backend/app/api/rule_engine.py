from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.audit_flag import AuditFlag
from app.models.transaction import Transaction
from app.models.user import User
from app.rules import benfords_law
from app.schemas.rules import (
    AuditFlagOut,
    BatchEvaluationOut,
    BenfordsLawOut,
    TransactionEvaluationOut,
    TransactionFlagsOut,
)
from app.services.risk_scoring import evaluate_transaction, get_open_flags

router = APIRouter(prefix="/transactions", tags=["rule-engine"])


@router.post("/evaluate-all", response_model=BatchEvaluationOut)
def evaluate_all_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BatchEvaluationOut:
    transactions = db.scalars(select(Transaction)).all()

    risk_level_counts: Counter[str] = Counter()
    flagged_count = 0

    for transaction in transactions:
        evaluate_transaction(transaction, db)
        if transaction.risk_score > 0:
            flagged_count += 1
        risk_level_counts[transaction.risk_level.value if transaction.risk_level else "none"] += 1

    db.commit()

    benfords_result = benfords_law.analyze(transactions)

    return BatchEvaluationOut(
        evaluated_count=len(transactions),
        flagged_count=flagged_count,
        risk_level_counts=dict(risk_level_counts),
        benfords_law=BenfordsLawOut.model_validate(benfords_result)
        if benfords_result is not None
        else None,
    )


@router.post("/{transaction_id}/evaluate", response_model=TransactionEvaluationOut)
def evaluate_single_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionEvaluationOut:
    transaction = db.scalars(
        select(Transaction).where(Transaction.id == transaction_id)
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )

    evaluate_transaction(transaction, db)
    db.commit()

    return TransactionEvaluationOut(
        transaction_id=transaction.id,
        transaction_ref=transaction.transaction_ref,
        risk_score=transaction.risk_score,
        risk_level=transaction.risk_level,
        flags=[AuditFlagOut.model_validate(flag) for flag in get_open_flags(db, transaction.id)],
    )


@router.get("/{transaction_id}/flags", response_model=TransactionFlagsOut)
def get_transaction_flags(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionFlagsOut:
    """Read-only: returns whatever's already in the DB, never calls
    evaluate_transaction() or writes anything."""
    transaction = db.scalars(
        select(Transaction).where(Transaction.id == transaction_id)
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )

    has_flag_history = (
        db.scalar(
            select(func.count())
            .select_from(AuditFlag)
            .where(AuditFlag.transaction_id == transaction_id)
        )
        or 0
    ) > 0

    return TransactionFlagsOut(
        transaction_id=transaction.id,
        transaction_ref=transaction.transaction_ref,
        risk_score=transaction.risk_score,
        risk_level=transaction.risk_level,
        evaluated=has_flag_history,
        flags=[AuditFlagOut.model_validate(flag) for flag in get_open_flags(db, transaction.id)],
    )
