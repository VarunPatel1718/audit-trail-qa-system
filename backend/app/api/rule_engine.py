from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.audit_flag import AuditFlag
from app.models.enums import FlagStatus
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.rules import AuditFlagOut, BatchEvaluationOut, TransactionEvaluationOut
from app.services.risk_scoring import evaluate_transaction

router = APIRouter(prefix="/transactions", tags=["rule-engine"])


def _open_flags(transaction_id: int, db: Session) -> list[AuditFlag]:
    return list(
        db.scalars(
            select(AuditFlag).where(
                AuditFlag.transaction_id == transaction_id,
                AuditFlag.status == FlagStatus.OPEN,
            )
        )
    )


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

    return BatchEvaluationOut(
        evaluated_count=len(transactions),
        flagged_count=flagged_count,
        risk_level_counts=dict(risk_level_counts),
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
        flags=[AuditFlagOut.model_validate(flag) for flag in _open_flags(transaction.id, db)],
    )
