"""codal_announcements: drop UNIQUE(code), add partial UNIQUE(letter_serial)

Revision ID: 031_codal_letter_serial_uniq
Revises: 030_crypto_trades_hypertable
Create Date: 2026-05-12

The original schema declared `code` UNIQUE, but on the BrsApi feed `code` is
the *letter category* (e.g. "ن-30" for monthly activity reports). Multiple
real announcements share the same code, so the unique constraint collapsed
distinct announcements into one row each. The true announcement ID is
`letter_serial` (the LetterSerial query param on codal.ir URLs).

This migration:
  1. Drops UNIQUE(code).
  2. Adds a partial unique index on letter_serial — partial so legacy rows
     left with letter_serial=NULL (from the financial-statement scraper
     before letter_serial was populated) don't fail the constraint.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "031_codal_letter_serial_uniq"
down_revision: Union[str, None] = "030_crypto_trades_hypertable"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw SQL with IF EXISTS / IF NOT EXISTS so the migration is idempotent.
    # Some envs already applied the schema change directly during incident triage.
    op.execute(
        "ALTER TABLE codal_announcements "
        "DROP CONSTRAINT IF EXISTS codal_announcements_code_key"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS codal_announcements_letter_serial_uniq "
        "ON codal_announcements (letter_serial) "
        "WHERE letter_serial IS NOT NULL"
    )


def downgrade() -> None:
    op.execute(
        "DROP INDEX IF EXISTS codal_announcements_letter_serial_uniq"
    )
    # Note: re-adding UNIQUE(code) will fail if real-world data already
    # contains duplicate codes (which it should, by design). Callers
    # downgrading must first deduplicate codal_announcements by code.
    op.execute(
        "ALTER TABLE codal_announcements "
        "ADD CONSTRAINT codal_announcements_code_key UNIQUE (code)"
    )
