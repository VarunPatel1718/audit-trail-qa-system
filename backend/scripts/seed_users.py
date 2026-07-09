"""Seed one test user per role (Auditor, Finance Manager, Admin) for local dev/testing.

Idempotent: re-running skips roles/users that already exist.

Usage (from backend/):
    ./venv/Scripts/python.exe scripts/seed_users.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.auth.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.role import Role  # noqa: E402
from app.models.user import User  # noqa: E402

# Dev/testing only — never reuse this password outside a local environment.
TEST_PASSWORD = "ChangeMe123!"

SEED_USERS = [
    {"role_name": "Auditor", "email": "auditor@example.com", "full_name": "Test Auditor"},
    {
        "role_name": "Finance Manager",
        "email": "finance.manager@example.com",
        "full_name": "Test Finance Manager",
    },
    {"role_name": "Admin", "email": "admin@example.com", "full_name": "Test Admin"},
]


def get_or_create_role(db, name: str) -> Role:
    role = db.scalars(select(Role).where(Role.name == name)).first()
    if role is None:
        role = Role(name=name)
        db.add(role)
        db.flush()
        print(f"Created role: {name}")
    return role


def seed() -> None:
    db = SessionLocal()
    try:
        for entry in SEED_USERS:
            role = get_or_create_role(db, entry["role_name"])

            user = db.scalars(select(User).where(User.email == entry["email"])).first()
            if user is not None:
                print(f"{entry['role_name']} user already exists: {entry['email']}")
                continue

            user = User(
                email=entry["email"],
                full_name=entry["full_name"],
                hashed_password=hash_password(TEST_PASSWORD),
                role_id=role.id,
                is_active=True,
            )
            db.add(user)
            print(f"Created {entry['role_name']} user: {entry['email']}")

        db.commit()
    finally:
        db.close()

    print(f"\nSeed complete. Test password for all seeded users: {TEST_PASSWORD}")


if __name__ == "__main__":
    seed()
