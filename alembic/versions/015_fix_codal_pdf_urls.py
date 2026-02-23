"""Fix relative Codal PDF/file URLs and reset failed PDF downloads

Revision ID: 015_fix_codal_pdf_urls
Revises: 014_add_risk_profiling
Create Date: 2026-02-23
"""

from typing import Sequence, Union

from alembic import op

revision: str = "015_fix_codal_pdf_urls"
down_revision: Union[str, None] = "014_add_risk_profiling"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fix relative URLs in codal_announcements
    op.execute(
        "UPDATE codal_announcements SET link_pdf = 'https://codal.ir/' || LTRIM(link_pdf, '/') "
        "WHERE link_pdf IS NOT NULL AND link_pdf NOT LIKE 'http%'"
    )
    op.execute(
        "UPDATE codal_announcements SET link_excel = 'https://codal.ir/' || LTRIM(link_excel, '/') "
        "WHERE link_excel IS NOT NULL AND link_excel NOT LIKE 'http%'"
    )
    op.execute(
        "UPDATE codal_announcements SET link_attachment = 'https://codal.ir/' || LTRIM(link_attachment, '/') "
        "WHERE link_attachment IS NOT NULL AND link_attachment NOT LIKE 'http%'"
    )

    # Fix relative URLs in pdf_documents
    op.execute(
        "UPDATE pdf_documents SET source_url = 'https://codal.ir/' || LTRIM(source_url, '/') "
        "WHERE source_url IS NOT NULL AND source_url NOT LIKE 'http%'"
    )

    # Reset failed PDF downloads so they can be retried with correct URLs
    op.execute(
        "UPDATE pdf_documents SET status = 'pending', retry_count = 0, error_message = NULL "
        "WHERE status = 'failed'"
    )

    # Fix codal_raw_responses.storage_path: old spider stored "codal/raw/file.gz"
    # but files live at data/codal_raw/file.gz (relative to BASE_DIR).
    # The API now resolves paths as BASE_DIR / storage_path, so update existing rows.
    op.execute(
        "UPDATE codal_raw_responses "
        "SET storage_path = 'data/codal_raw/' || SUBSTRING(storage_path FROM 'codal/raw/(.+)$') "
        "WHERE storage_path LIKE 'codal/raw/%'"
    )


def downgrade() -> None:
    # Remove the https://codal.ir/ prefix that was added
    op.execute(
        "UPDATE codal_announcements SET link_pdf = SUBSTRING(link_pdf FROM 18) "
        "WHERE link_pdf IS NOT NULL AND link_pdf LIKE 'https://codal.ir/%'"
    )
    op.execute(
        "UPDATE codal_announcements SET link_excel = SUBSTRING(link_excel FROM 18) "
        "WHERE link_excel IS NOT NULL AND link_excel LIKE 'https://codal.ir/%'"
    )
    op.execute(
        "UPDATE codal_announcements SET link_attachment = SUBSTRING(link_attachment FROM 18) "
        "WHERE link_attachment IS NOT NULL AND link_attachment LIKE 'https://codal.ir/%'"
    )
    op.execute(
        "UPDATE pdf_documents SET source_url = SUBSTRING(source_url FROM 18) "
        "WHERE source_url IS NOT NULL AND source_url LIKE 'https://codal.ir/%'"
    )
    # Revert codal_raw_responses storage_path back to old "codal/raw/" prefix
    op.execute(
        "UPDATE codal_raw_responses "
        "SET storage_path = 'codal/raw/' || SUBSTRING(storage_path FROM 'data/codal_raw/(.+)$') "
        "WHERE storage_path LIKE 'data/codal_raw/%'"
    )
