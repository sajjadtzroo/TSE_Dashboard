"""Add MinIO object storage keys to file-related tables

Revision ID: 016_add_minio_storage
Revises: 015_fix_codal_pdf_urls
Create Date: 2026-02-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "016_add_minio_storage"
down_revision: Union[str, None] = "015_fix_codal_pdf_urls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # codal_announcements — three separate keys (pdf, excel, attachment)
    op.add_column("codal_announcements", sa.Column("minio_pdf_key", sa.Text(), nullable=True, comment="MinIO object key for PDF file"))
    op.add_column("codal_announcements", sa.Column("minio_excel_key", sa.Text(), nullable=True, comment="MinIO object key for Excel file"))
    op.add_column("codal_announcements", sa.Column("minio_attachment_key", sa.Text(), nullable=True, comment="MinIO object key for attachment"))

    # codal_raw_responses — single key; also make storage_path nullable for future rows
    op.add_column("codal_raw_responses", sa.Column("minio_key", sa.Text(), nullable=True, comment="MinIO object key for this raw file"))
    op.alter_column("codal_raw_responses", "storage_path", nullable=True)

    # pdf_documents — single key
    op.add_column("pdf_documents", sa.Column("minio_key", sa.Text(), nullable=True, comment="MinIO object key for this PDF"))

    # file_uploads — single key
    op.add_column("file_uploads", sa.Column("minio_key", sa.Text(), nullable=True, comment="MinIO object key for this upload"))


def downgrade() -> None:
    op.drop_column("file_uploads", "minio_key")
    op.drop_column("pdf_documents", "minio_key")
    op.drop_column("codal_raw_responses", "minio_key")
    op.alter_column("codal_raw_responses", "storage_path", nullable=False)
    op.drop_column("codal_announcements", "minio_attachment_key")
    op.drop_column("codal_announcements", "minio_excel_key")
    op.drop_column("codal_announcements", "minio_pdf_key")
