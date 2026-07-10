"""Seed vendors, departments, and exactly TARGET_TRANSACTION_COUNT synthetic
transactions for local dev/testing, including deliberate anomalies for every
Phase 7 rule module to detect:
  - exact duplicate payments (same vendor, amount, department, date)
  - round-number amounts (e.g. exactly 5000.00, 10000.00)
  - threshold-violating amounts (well above a typical approval threshold)
  - debit/credit mismatches (a vendor payment recorded as a credit)
  - vendor-account mismatches (account_number doesn't match the vendor's known account)
  - missing approval (status implies sign-off but approved_by_id is null)
  - split payments (several sub-threshold transactions to one vendor, close
    together, that sum to at/above the threshold)
  - holiday-dated transactions (weekend transactions occur naturally from the
    random date spread, so aren't separately seeded)

Baseline (non-anomalous) transactions are debit_credit=DEBIT with
account_number matching their vendor's bank_account_number, since those are
exactly the invariants the new rules check — anomalies are the only
deliberate violations of them.

Idempotent: vendors/departments are matched by unique code (skipped if they
already exist). Transactions are deleted and re-inserted from scratch on every
run, so re-running always leaves exactly TARGET_TRANSACTION_COUNT rows instead
of appending a duplicate batch on top of the last run's data.

Usage (from backend/):
    ./venv/Scripts/python.exe scripts/seed_transactions.py
"""

import random
import sys
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.audit_flag import AuditFlag  # noqa: E402
from app.models.department import Department  # noqa: E402
from app.models.enums import DebitCredit, TransactionStatus  # noqa: E402
from app.models.transaction import Transaction  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.vendor import Vendor  # noqa: E402

random.seed(42)  # reproducible synthetic data across runs

VENDORS = [
    ("Acme Office Supplies", "VEND-001", True),
    ("Northwind Logistics", "VEND-002", True),
    ("Globex Industrial Parts", "VEND-003", True),
    ("Initech Software Licensing", "VEND-004", True),
    ("Umbrella Facilities Group", "VEND-005", True),
    ("Stark Engineering Services", "VEND-006", True),
    ("Wayne Consulting Partners", "VEND-007", True),
    ("Wonka Catering Co", "VEND-008", True),
    ("Hooli Cloud Services", "VEND-009", True),
    ("Pied Piper Data Systems", "VEND-010", True),
    ("Massive Dynamic Research", "VEND-011", True),
    ("Soylent Marketing Group", "VEND-012", True),
    ("Cyberdyne IT Hardware", "VEND-013", True),
    ("Aperture Lab Supplies", "VEND-014", True),
    ("Gringotts Financial Advisory", "VEND-015", True),
    ("Legacy Print & Signage", "VEND-016", False),  # inactive: retired vendor
    ("Discontinued Freight Co", "VEND-017", False),  # inactive: retired vendor
]

DEPARTMENTS = [
    ("Finance", "FIN"),
    ("Information Technology", "IT"),
    ("Marketing", "MKT"),
    ("Operations", "OPS"),
    ("Human Resources", "HR"),
    ("Sales", "SALES"),
    ("Legal", "LEGAL"),
    ("Procurement", "PROC"),
]

DESCRIPTIONS = [
    "Monthly service invoice",
    "Office supplies restock",
    "Software license renewal",
    "Consulting services rendered",
    "Equipment purchase",
    "Facilities maintenance",
    "Travel & expense reimbursement",
    "Catering for internal event",
    "Freight & logistics charge",
    "Quarterly retainer payment",
    "Hardware procurement",
    "Marketing campaign spend",
    "Professional services fee",
    "Utility payment",
    "Contract milestone payment",
]

TARGET_TRANSACTION_COUNT = 288
ROUND_NUMBER_COUNT = 10
DUPLICATE_PAIR_COUNT = 6
THRESHOLD_VIOLATION_COUNT = 8
DEBIT_CREDIT_ANOMALY_COUNT = 6
VENDOR_ACCOUNT_MISMATCH_COUNT = 6
MISSING_APPROVAL_COUNT = 6
SPLIT_PAYMENT_GROUP_COUNT = 2
SPLIT_PAYMENT_GROUP_SIZE = 3
HOLIDAY_ANOMALY_COUNT = 4
THRESHOLD_AMOUNT = settings.threshold_violation_amount  # same knob the Phase 7 rule engine reads

# Weekday-only holidays from the configured list (a holiday landing on a
# weekend wouldn't isolate the weekend_holiday rule's "holiday" reason).
HOLIDAY_ANOMALY_DATES = [d for d in sorted(settings.holidays) if d.weekday() < 5][
    :HOLIDAY_ANOMALY_COUNT
]

ROUND_AMOUNTS = [
    Decimal("1000.00"),
    Decimal("2000.00"),
    Decimal("2500.00"),
    Decimal("5000.00"),
    Decimal("7500.00"),
    Decimal("10000.00"),
    Decimal("15000.00"),
    Decimal("20000.00"),
]

STATUS_WEIGHTS = {
    TransactionStatus.PENDING: 0.15,
    TransactionStatus.APPROVED: 0.35,
    TransactionStatus.CLEARED: 0.35,
    TransactionStatus.FLAGGED: 0.05,
    TransactionStatus.REJECTED: 0.10,
}


def get_or_create_department(db, name: str, code: str) -> Department:
    dept = db.scalars(select(Department).where(Department.code == code)).first()
    if dept is None:
        dept = Department(name=name, code=code, is_active=True)
        db.add(dept)
        db.flush()
        print(f"Created department: {name} ({code})")
    return dept


def get_or_create_vendor(db, name: str, vendor_code: str, is_active: bool) -> Vendor:
    vendor = db.scalars(select(Vendor).where(Vendor.vendor_code == vendor_code)).first()
    if vendor is None:
        vendor = Vendor(
            name=name,
            vendor_code=vendor_code,
            bank_account_number=f"AC{random.randint(10**9, 10**10 - 1)}",
            is_active=is_active,
        )
        db.add(vendor)
        db.flush()
        print(f"Created vendor: {name} ({vendor_code})")
    return vendor


def clear_transactions(db) -> int:
    """Delete all existing transactions (and their audit_flags) so re-running
    this script is idempotent.

    audit_flags is entirely derived output of the Phase 7 rule engine (re-running
    evaluate-all regenerates it), so it's safe to clear alongside transactions.
    audit_cases/audit_notes are deliberately left untouched: this is a plain
    bulk DELETE, not TRUNCATE ... CASCADE, so it will raise loudly if either of
    those ever holds rows referencing a transaction, rather than silently
    wiping audit data this script has no business touching.
    """
    db.query(AuditFlag).delete()
    deleted = db.query(Transaction).delete()
    db.commit()
    return deleted


def random_amount(low: float = 15, high: float = 8000) -> Decimal:
    cents = random.randint(int(low * 100), int(high * 100))
    if cents % 100 == 0:  # nudge off round numbers so real anomalies stand out
        cents += random.choice([1, -1, 7, -23, 49])
    return Decimal(cents) / 100


def random_date(days_back: int = 365) -> datetime:
    return datetime.now(timezone.utc) - timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


def random_status() -> TransactionStatus:
    return random.choices(
        list(STATUS_WEIGHTS.keys()), weights=list(STATUS_WEIGHTS.values())
    )[0]


def build_transaction(
    ref: str,
    vendors: list[Vendor],
    departments: list[Department],
    user_ids: list[int],
    *,
    amount: Decimal | None = None,
    vendor: Vendor | None = None,
    department: Department | None = None,
    transaction_date: datetime | None = None,
    debit_credit: DebitCredit = DebitCredit.DEBIT,
    account_number: str | None = None,
    status: TransactionStatus | None = None,
    force_missing_approval: bool = False,
) -> Transaction:
    """Baseline (all defaults) builds a "clean" transaction: DEBIT, account_number
    matching the vendor's own bank account, and approved_by_id set whenever status
    implies sign-off. Every anomaly block below overrides exactly the field(s) it
    means to violate, so baseline data never false-positives on the new rules.
    """
    vendor = vendor or random.choice(vendors)
    department = department or random.choice(departments)
    amount = amount if amount is not None else random_amount()
    transaction_date = transaction_date or random_date()
    status = status or random_status()
    account_number = account_number if account_number is not None else vendor.bank_account_number

    created_by_id = random.choice(user_ids) if user_ids else None
    if force_missing_approval:
        approved_by_id = None
    else:
        approved_by_id = (
            random.choice(user_ids)
            if user_ids and status in (TransactionStatus.APPROVED, TransactionStatus.CLEARED)
            else None
        )

    return Transaction(
        transaction_ref=ref,
        vendor_id=vendor.id,
        department_id=department.id,
        amount=amount,
        currency="USD",
        debit_credit=debit_credit,
        account_number=account_number,
        transaction_date=transaction_date,
        description=random.choice(DESCRIPTIONS),
        status=status,
        created_by_id=created_by_id,
        approved_by_id=approved_by_id,
    )


def seed() -> None:
    db = SessionLocal()
    try:
        departments = [get_or_create_department(db, name, code) for name, code in DEPARTMENTS]
        vendors = [
            get_or_create_vendor(db, name, code, is_active) for name, code, is_active in VENDORS
        ]
        db.commit()

        user_ids = list(db.scalars(select(User.id)))
        if not user_ids:
            print(
                "Warning: no users found — run scripts/seed_users.py first for "
                "realistic created_by/approved_by data. Continuing without them."
            )

        cleared = clear_transactions(db)
        if cleared:
            print(f"Cleared {cleared} existing transactions before reseeding.")

        ref_counter = 1

        def next_ref() -> str:
            nonlocal ref_counter
            ref = f"TXN-{ref_counter:06d}"
            ref_counter += 1
            return ref

        anomaly_count = (
            ROUND_NUMBER_COUNT
            + DUPLICATE_PAIR_COUNT
            + THRESHOLD_VIOLATION_COUNT
            + DEBIT_CREDIT_ANOMALY_COUNT
            + VENDOR_ACCOUNT_MISMATCH_COUNT
            + MISSING_APPROVAL_COUNT
            + SPLIT_PAYMENT_GROUP_COUNT * SPLIT_PAYMENT_GROUP_SIZE
            + len(HOLIDAY_ANOMALY_DATES)
        )
        normal_count = TARGET_TRANSACTION_COUNT - anomaly_count

        transactions: list[Transaction] = [
            build_transaction(next_ref(), vendors, departments, user_ids)
            for _ in range(normal_count)
        ]

        # Anomaly 1: round-number amounts.
        for _ in range(ROUND_NUMBER_COUNT):
            transactions.append(
                build_transaction(
                    next_ref(),
                    vendors,
                    departments,
                    user_ids,
                    amount=random.choice(ROUND_AMOUNTS),
                )
            )

        # Anomaly 2: exact duplicate payments — same vendor/department/amount/date,
        # just a different ref, mimicking an accidental double payment. Sources
        # are drawn from a frozen snapshot taken *before* this loop starts, so a
        # duplicate clone can never itself be picked as another pair's source
        # (which would chain pairs into an accidental triple).
        duplicate_source_pool = list(transactions)
        for _ in range(DUPLICATE_PAIR_COUNT):
            source = random.choice(duplicate_source_pool)
            transactions.append(
                build_transaction(
                    next_ref(),
                    vendors,
                    departments,
                    user_ids,
                    amount=source.amount,
                    vendor=next(v for v in vendors if v.id == source.vendor_id),
                    department=next(d for d in departments if d.id == source.department_id),
                    transaction_date=source.transaction_date,
                )
            )

        # Anomaly 3: threshold-violating amounts — well above THRESHOLD_AMOUNT.
        for _ in range(THRESHOLD_VIOLATION_COUNT):
            transactions.append(
                build_transaction(
                    next_ref(),
                    vendors,
                    departments,
                    user_ids,
                    amount=random_amount(
                        float(THRESHOLD_AMOUNT) * 1.5, float(THRESHOLD_AMOUNT) * 9
                    ),
                )
            )

        # Anomaly 4: debit/credit mismatches — a vendor payment recorded as a
        # credit instead of the expected debit.
        for _ in range(DEBIT_CREDIT_ANOMALY_COUNT):
            transactions.append(
                build_transaction(
                    next_ref(),
                    vendors,
                    departments,
                    user_ids,
                    debit_credit=DebitCredit.CREDIT,
                )
            )

        # Anomaly 5: vendor-account mismatches — account_number doesn't match
        # the vendor's own bank_account_number.
        for _ in range(VENDOR_ACCOUNT_MISMATCH_COUNT):
            transactions.append(
                build_transaction(
                    next_ref(),
                    vendors,
                    departments,
                    user_ids,
                    account_number=f"WRONG{random.randint(10**6, 10**7 - 1)}",
                )
            )

        # Anomaly 6: missing approval — status implies sign-off but no
        # approver is on record.
        for _ in range(MISSING_APPROVAL_COUNT):
            transactions.append(
                build_transaction(
                    next_ref(),
                    vendors,
                    departments,
                    user_ids,
                    status=random.choice([TransactionStatus.APPROVED, TransactionStatus.CLEARED]),
                    force_missing_approval=True,
                )
            )

        # Anomaly 7: split payments — several sub-threshold transactions to
        # the same vendor, close together, summing to at/above the threshold
        # (structuring to dodge approval).
        for _ in range(SPLIT_PAYMENT_GROUP_COUNT):
            split_vendor = random.choice(vendors)
            split_department = random.choice(departments)
            base_date = random_date()
            remaining = THRESHOLD_AMOUNT * Decimal("1.02")
            for i in range(SPLIT_PAYMENT_GROUP_SIZE):
                if i == SPLIT_PAYMENT_GROUP_SIZE - 1:
                    chunk = remaining
                else:
                    share = remaining / (SPLIT_PAYMENT_GROUP_SIZE - i)
                    jitter = Decimal(random.randint(-500, 500)) / 100
                    chunk = (share + jitter).quantize(Decimal("0.01"))
                    remaining -= chunk
                transactions.append(
                    build_transaction(
                        next_ref(),
                        vendors,
                        departments,
                        user_ids,
                        amount=chunk,
                        vendor=split_vendor,
                        department=split_department,
                        transaction_date=base_date + timedelta(hours=6 * i),
                    )
                )

        # Anomaly 8: holiday-dated transactions (weekday holidays only, so the
        # weekend_holiday rule's "holiday" reason is exercised distinctly from
        # its naturally-occurring "weekend" hits).
        for holiday_date in HOLIDAY_ANOMALY_DATES:
            transactions.append(
                build_transaction(
                    next_ref(),
                    vendors,
                    departments,
                    user_ids,
                    transaction_date=datetime.combine(
                        holiday_date, time(hour=random.randint(8, 17)), tzinfo=timezone.utc
                    ),
                )
            )

        random.shuffle(transactions)
        db.add_all(transactions)
        db.commit()

        print(f"\nSeed complete. Inserted {len(transactions)} transactions:")
        print(f"  - {normal_count} baseline transactions")
        print(f"  - {ROUND_NUMBER_COUNT} round-number anomalies")
        print(f"  - {DUPLICATE_PAIR_COUNT} exact-duplicate anomalies")
        print(f"  - {THRESHOLD_VIOLATION_COUNT} threshold-violating anomalies (> {THRESHOLD_AMOUNT})")
        print(f"  - {DEBIT_CREDIT_ANOMALY_COUNT} debit/credit mismatch anomalies")
        print(f"  - {VENDOR_ACCOUNT_MISMATCH_COUNT} vendor-account mismatch anomalies")
        print(f"  - {MISSING_APPROVAL_COUNT} missing-approval anomalies")
        print(
            f"  - {SPLIT_PAYMENT_GROUP_COUNT} split-payment groups of "
            f"{SPLIT_PAYMENT_GROUP_SIZE} ({SPLIT_PAYMENT_GROUP_COUNT * SPLIT_PAYMENT_GROUP_SIZE} transactions)"
        )
        print(f"  - {len(HOLIDAY_ANOMALY_DATES)} holiday-dated anomalies")
        print(f"Vendors: {len(vendors)} ({sum(1 for *_, active in VENDORS if not active)} inactive)")
        print(f"Departments: {len(departments)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
