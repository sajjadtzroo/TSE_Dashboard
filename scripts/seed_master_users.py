"""
Seed master users into the database.

Creates two permanent accounts on first run:
  - master_admin  (role: admin)
  - master_trader (role: trader)

Passwords are read from environment variables:
  MASTER_ADMIN_PASSWORD   (required)
  MASTER_TRADER_PASSWORD  (required)

Re-running this script is safe but does NOT overwrite the password — only
email/role/is_active are updated on conflict. This preserves any post-deploy
password rotation an admin made via PATCH /api/auth/me; previously every
container restart silently re-imprinted the env value over the live password,
making rotation impossible.

To force a password reset for a master user, delete the row first and re-run
this script.

Usage:
    python scripts/seed_master_users.py
"""

import os
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from passlib.context import CryptContext
from sqlalchemy import text

from config.settings import DATABASE_URL
from database.connection import get_db_manager

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Reject obvious template/placeholder passwords. The .env.template ships
# `change-me-strong-admin-password` as a literal default; if an operator
# never updated it, refuse to seed rather than create a known-credential
# admin in production.
_REJECTED_PASSWORDS = {
    "change-me-strong-admin-password",
    "change-me-strong-trader-password",
    "changeme",
    "password",
    "admin",
}


def _validate_password(label: str, value: str) -> str:
    if not value:
        print(f"ERROR: {label} must be set in .env or environment.")
        sys.exit(1)
    if value.strip().lower() in _REJECTED_PASSWORDS or value.startswith("change-me"):
        print(
            f"ERROR: {label} is set to a template/placeholder value. "
            f"Pick a strong unique password before seeding."
        )
        sys.exit(1)
    if len(value) < 12:
        print(f"ERROR: {label} is shorter than 12 characters.")
        sys.exit(1)
    return value


_admin_pw = _validate_password("MASTER_ADMIN_PASSWORD", os.environ.get("MASTER_ADMIN_PASSWORD", ""))
_trader_pw = _validate_password("MASTER_TRADER_PASSWORD", os.environ.get("MASTER_TRADER_PASSWORD", ""))

MASTER_USERS = [
    {
        "username": "master_admin",
        "email": "master_admin@tse.local",
        "password": _admin_pw,
        "role": "admin",
    },
    {
        "username": "master_trader",
        "email": "master_trader@tse.local",
        "password": _trader_pw,
        "role": "trader",
    },
]


def main():
    db_manager = get_db_manager(DATABASE_URL)

    with db_manager.get_session() as session:
        for u in MASTER_USERS:
            hashed = pwd_context.hash(u["password"])
            session.execute(
                text("""
                    INSERT INTO users (username, email, hashed_password, role, is_active)
                    VALUES (:username, :email, :hashed_password, :role, true)
                    ON CONFLICT (username) DO UPDATE
                        SET email      = EXCLUDED.email,
                            role       = EXCLUDED.role,
                            is_active  = true,
                            updated_at = now()
                """),
                {
                    "username": u["username"],
                    "email": u["email"],
                    "hashed_password": hashed,
                    "role": u["role"],
                },
            )
            print(f"  OK  {u['username']}  ({u['role']})")

        session.commit()

    print("\nDone. Master users are ready.")


if __name__ == "__main__":
    main()
