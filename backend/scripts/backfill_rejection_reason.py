"""One-off backfill for the rejection-reason storage gap (see PROGRESS.md):
`reject_note()` used to append the reason as trailing text into `content`
instead of a dedicated column. Now that `audit_notes.rejection_reason`
exists (migration 4e134c9dade0), this finds every REJECTED note whose
`content` still has the old appended marker, splits it back into clean
`content` + `rejection_reason`, and writes both.

Safe by default: always dry-run (prints exactly what it would change,
touches nothing). Only writes with --execute, and even then backs up each
row's pre-change state (id, content, rejection_reason) to a JSON file
first, so a mistake is reversible by hand. Naturally idempotent: once a
row's content no longer contains the marker, a re-run won't touch it again.

Usage (from backend/):
    ./venv/Scripts/python.exe scripts/backfill_rejection_reason.py            # dry run
    ./venv/Scripts/python.exe scripts/backfill_rejection_reason.py --execute  # actually write
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.audit_note import AuditNote  # noqa: E402
from app.models.enums import AuditNoteStatus  # noqa: E402

# Same marker reject_note() used to append and the frontend's
# splitRejectionReason() already detects -- see frontend/src/lib/auditNote.ts.
REJECTION_REASON_MARKER = "\n\nRejection Reason: "

BACKUP_DIR = Path(__file__).resolve().parent / "backups"


def find_notes_to_backfill(db) -> list[AuditNote]:
    notes = db.scalars(select(AuditNote).where(AuditNote.status == AuditNoteStatus.REJECTED)).all()
    return [n for n in notes if REJECTION_REASON_MARKER in n.content]


def split(content: str) -> tuple[str, str]:
    idx = content.index(REJECTION_REASON_MARKER)
    clean_content = content[:idx]
    reason = content[idx + len(REJECTION_REASON_MARKER) :]
    return clean_content, reason


def report(notes: list[AuditNote]) -> dict[int, tuple[str, str]]:
    plan: dict[int, tuple[str, str]] = {}

    if not notes:
        print("No REJECTED notes found with an appended rejection reason. Nothing to do.")
        return plan

    print(f"Found {len(notes)} REJECTED note(s) with an appended rejection reason:\n")
    for note in notes:
        clean_content, reason = split(note.content)
        plan[note.id] = (clean_content, reason)
        print(f"Note id={note.id}:")
        print(f"  Current content length:  {len(note.content)} chars")
        print(f"  Restored content length: {len(clean_content)} chars")
        print(f'  Extracted rejection_reason: "{reason}"')
        print()

    return plan


def write_backup(notes: list[AuditNote]) -> Path:
    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = BACKUP_DIR / f"rejection_reason_backfill_before_{timestamp}.json"

    records = [
        {"id": note.id, "content": note.content, "rejection_reason": note.rejection_reason} for note in notes
    ]
    with backup_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    return backup_path


def execute(db, notes: list[AuditNote], plan: dict[int, tuple[str, str]]) -> None:
    backup_path = write_backup(notes)
    print(f"Backed up pre-change state of {len(notes)} row(s) to: {backup_path}\n")

    for note in notes:
        clean_content, reason = plan[note.id]
        note.content = clean_content
        note.rejection_reason = reason
        print(f"Updated note id={note.id}: content restored, rejection_reason set.")

    db.commit()
    print("\nDone. content is now exactly what was originally generated; rejection_reason holds the reason.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually write the changes. Without this flag, only prints the plan (dry run).",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        notes = find_notes_to_backfill(db)
        plan = report(notes)

        if not plan:
            return

        if not args.execute:
            print("Dry run only -- no changes made. Re-run with --execute to actually write the changes above.")
            return

        execute(db, notes, plan)
    finally:
        db.close()


if __name__ == "__main__":
    main()
