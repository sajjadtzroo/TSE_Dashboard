"""
Seed master users into the database.

Creates (or updates) two permanent accounts:
  - master_admin  / MasterAdmin@2026   (role: admin)
  - master_trader / MasterTrader@2026  (role: trader)

Safe to re-run — uses ON CONFLICT DO UPDATE so passwords are refreshed if changed.

Usage:
    python scripts/seed_master_users.py
"""

import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from passlib.context import CryptContext
from sqlalchemy import text

from config.settings import DATABASE_URL
from database.connection import get_db_manager

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MASTER_USERS = [
    {
        "username": "master_admin",
        "email": "master_admin@tse.local",
        "password": "MasterAdmin@2026",
        "role": "admin",
    },
    {
        "username": "master_trader",
        "email": "master_trader@tse.local",
        "password": "MasterTrader@2026",
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
                        SET hashed_password = EXCLUDED.hashed_password,
                            email           = EXCLUDED.email,
                            role            = EXCLUDED.role,
                            is_active       = true,
                            updated_at      = now()
                """),
                {
                    "username": u["username"],
                    "email": u["email"],
                    "hashed_password": hashed,
                    "role": u["role"],
                },
            )
            print(f"  OK  {u['username']}  ({u['role']})  ->  {u['password']}")

        session.commit()

    print("\nDone. Master users are ready.")


if __name__ == "__main__":
    main()
