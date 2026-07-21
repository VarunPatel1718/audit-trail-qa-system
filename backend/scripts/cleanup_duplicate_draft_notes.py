"""One-off cleanup for the `generate_audit_note()` idempotency bug (see
PROGRESS.md's Blockers section): before the idempotency guard was added,
calling it more than once for the same transaction created duplicate
`audit_notes` rows. Live data has three such pairs, all still sitting at
DRAFT (transactions 1485, 1436, 1613) -- this script finds any transaction
with more than one DRAFT-status note, keeps the most recent (by
created_at, ties broken by highest id), and removes the older duplicate(s).

Safe by default: always dry-run (prints exactly what it would do, changes
nothing). Only actually deletes with --execute, and even then writes a
full JSON backup of every row about to be deleted (all columns, not just
the id) before touching the DB, so a mistaken cleanup is always reversible
by hand from the backup file -- nothing is destroyed silently.

Usage (from backend/):
    ./venv/Scripts/python.exe scripts/cleanup_duplicate_draft_notes.py            # dry run
    ./venv/Scripts/python.exe scripts/cleanup_duplicate_draft_notes.py --execute  # actually delete
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import joinedload  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.audit_flag import AuditFlag  # noqa: E402
from app.models.audit_note import AuditNote  # noqa: E402
from app.models.enums import AuditNoteStatus  # noqa: E402

BACKUP_DIR = Path(__file__).resolve().parent / "backups"


def find_duplicate_draft_groups(db) -> dict[int, list[AuditNote]]:
    """Returns {transaction_id: [note, note, ...]} for every transaction with
    more than one DRAFT note, each group ordered most-recent-first."""
    notes = db.scalars(
        select(AuditNote)
        .options(joinedload(AuditNote.audit_flag))
        .where(AuditNote.status == AuditNoteStatus.DRAFT)
        .order_by(AuditNote.created_at.desc(), AuditNote.id.desc())
    ).all()

    by_transaction: dict[int, list[AuditNote]] = {}
    for note in notes:
        by_transaction.setdefault(note.audit_flag.transaction_id, []).append(note)

    return {txn_id: group for txn_id, group in by_transaction.items() if len(group) > 1}


def note_to_dict(note: AuditNote, transaction_id: int) -> dict:
    """Full row dump -- every column, not just the id -- so the backup file
    alone is enough to reconstruct a deleted row by hand if ever needed."""
    return {
        "id": note.id,
        "transaction_id": transaction_id,
        "audit_flag_id": note.audit_flag_id,
        "content": note.content,
        "status": note.status.value,
        "cited_policy_ids": note.cited_policy_ids,
        "cited_case_ids": note.cited_case_ids,
        "created_by_id": note.created_by_id,
        "reviewed_by_id": note.reviewed_by_id,
        "submitted_at": note.submitted_at.isoformat() if note.submitted_at else None,
        "reviewed_at": note.reviewed_at.isoformat() if note.reviewed_at else None,
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat(),
    }


def report(groups: dict[int, list[AuditNote]]) -> dict[int, tuple[AuditNote, list[AuditNote]]]:
    """Prints the plan and returns {transaction_id: (kept_note, [notes_to_delete])}."""
    plan: dict[int, tuple[AuditNote, list[AuditNote]]] = {}

    if not groups:
        print("No transactions found with more than one DRAFT audit note. Nothing to do.")
        return plan

    print(f"Found {len(groups)} transaction(s) with duplicate DRAFT notes:\n")
    for txn_id, notes in sorted(groups.items()):
        keep, *duplicates = notes  # already ordered most-recent-first
        plan[txn_id] = (keep, duplicates)

        print(f"Transaction {txn_id}:")
        print(f"  KEEP    note id={keep.id}  created_at={keep.created_at.isoformat()}")
        for dup in duplicates:
            preview = dup.content.replace("\n", " ")[:80]
            print(f"  DELETE  note id={dup.id}  created_at={dup.created_at.isoformat()}  content=\"{preview}...\"")
        print()

    total_deletes = sum(len(dups) for _keep, dups in plan.values())
    print(f"Total: keep {len(plan)} note(s), delete {total_deletes} duplicate note(s).")
    return plan


def write_backup(plan: dict[int, tuple[AuditNote, list[AuditNote]]]) -> Path:
    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = BACKUP_DIR / f"deleted_duplicate_draft_notes_{timestamp}.json"

    records = []
    for txn_id, (_keep, duplicates) in plan.items():
        for dup in duplicates:
            records.append(note_to_dict(dup, txn_id))

    with backup_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    return backup_path


def execute(db, plan: dict[int, tuple[AuditNote, list[AuditNote]]]) -> None:
    backup_path = write_backup(plan)
    print(f"Backed up {sum(len(d) for _k, d in plan.values())} row(s) about to be deleted to: {backup_path}\n")

    for txn_id, (keep, duplicates) in plan.items():
        for dup in duplicates:
            db.delete(dup)
            print(f"Deleted note id={dup.id} (transaction {txn_id}); kept id={keep.id}")

    db.commit()
    print("\nDone. Duplicate DRAFT notes removed; the most recent note per transaction was kept.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete the duplicate rows. Without this flag, only prints the plan (dry run).",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        groups = find_duplicate_draft_groups(db)
        plan = report(groups)

        if not plan:
            return

        if not args.execute:
            print("\nDry run only -- no changes made. Re-run with --execute to actually delete the rows above.")
            return

        execute(db, plan)
    finally:
        db.close()


if __name__ == "__main__":
    main()
