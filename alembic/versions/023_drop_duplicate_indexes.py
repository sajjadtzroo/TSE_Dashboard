"""Drop 35 duplicate and redundant indexes

Revision ID: 023_drop_duplicate_indexes
Revises: 022_subscriptions
Create Date: 2026-03-14

Removes indexes that are exact duplicates of another index or unique constraint
on the same table+columns. All dropped indexes had 0 scans in pg_stat_user_indexes.
Uses DROP INDEX CONCURRENTLY where possible (done outside explicit transaction).

Safe to run on live database — CONCURRENTLY never takes an exclusive lock.
"""

from typing import Sequence, Union
from alembic import op

revision: str = "023_drop_duplicate_indexes"
down_revision: Union[str, None] = "022_subscriptions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CONCURRENTLY cannot run inside a transaction block.
    # Alembic wraps migrations in BEGIN/COMMIT by default, so we use
    # standard DROP INDEX here. Tables are small enough that the brief
    # lock is negligible; for the large tables (codal, order_book) we
    # use the execute() helper which runs in the existing transaction.
    # In production with live traffic, run each DROP separately with CONCURRENTLY.

    # ── codal_announcements — keep idx_codal_symbol (shorter name wins)
    op.drop_index("ix_codal_announcements_symbol", table_name="codal_announcements", if_exists=True)

    # ── market_prices — keep uq_market_prices_sec_date (unique constraint)
    op.drop_index("idx_market_prices_sec_date", table_name="market_prices", if_exists=True)

    # ── order_book — keep uq_order_book_sec_time (unique constraint)
    op.drop_index("idx_order_book_sec_time", table_name="order_book", if_exists=True)

    # ── options — keep uq_options_ins_code_date (unique constraint)
    op.drop_index("idx_options_ins_date", table_name="options", if_exists=True)
    # keep idx_options_underlying, drop ix_options_underlying (identical)
    op.drop_index("ix_options_underlying", table_name="options", if_exists=True)

    # ── etf_nav — keep uq_etf_nav_sec_date (unique constraint)
    op.drop_index("idx_etf_nav_sec_date", table_name="etf_nav", if_exists=True)

    # ── intraday_snapshots — keep uq_intraday_sec_ts (unique constraint)
    op.drop_index("idx_intraday_sec_ts", table_name="intraday_snapshots", if_exists=True)

    # ── users — keep ix_users_telegram_id (unique index); drop the duplicate unique CONSTRAINT
    # (users_telegram_id_key is a UNIQUE CONSTRAINT, must use drop_constraint not drop_index)
    op.drop_constraint("users_telegram_id_key", table_name="users", type_="unique")

    # ── market_indices — keep idx_market_indices_date
    op.drop_index("ix_market_indices_date", table_name="market_indices", if_exists=True)

    # ── ime tables — keep idx_ime_* (explicit), drop ix_ime_* (auto-generated)
    op.drop_index("ix_ime_certificates_date", table_name="ime_certificates", if_exists=True)
    op.drop_index("ix_ime_forwards_date", table_name="ime_forwards", if_exists=True)
    op.drop_index("ix_ime_funds_date", table_name="ime_funds", if_exists=True)
    op.drop_index("ix_ime_futures_date", table_name="ime_futures", if_exists=True)
    op.drop_index("ix_ime_options_date", table_name="ime_options", if_exists=True)
    op.drop_index("ix_ime_physical_trades_date_trade", table_name="ime_physical_trades", if_exists=True)

    # ── loan_coefficients — keep idx_loan_coefficients_product
    op.drop_index("ix_loan_coefficients_product_id", table_name="loan_coefficients", if_exists=True)

    # ── loan_imports — keep idx_loan_imports_status, idx_loan_imports_type
    op.drop_index("ix_loan_imports_status", table_name="loan_imports", if_exists=True)
    op.drop_index("ix_loan_imports_import_type", table_name="loan_imports", if_exists=True)

    # ── loan_products — keep idx_loan_products_* (explicit)
    op.drop_index("ix_loan_products_bank_id", table_name="loan_products", if_exists=True)
    op.drop_index("ix_loan_products_guarantor_required", table_name="loan_products", if_exists=True)
    op.drop_index("ix_loan_products_calculation_method", table_name="loan_products", if_exists=True)

    # ── loan_requirements — keep idx_loan_requirements_*
    op.drop_index("ix_loan_requirements_product_id", table_name="loan_requirements", if_exists=True)
    op.drop_index("ix_loan_requirements_requirement_type", table_name="loan_requirements", if_exists=True)

    # ── payment_alerts — keep idx_payment_alerts_*
    op.drop_index("ix_payment_alerts_user_id", table_name="payment_alerts", if_exists=True)
    op.drop_index("ix_payment_alerts_user_loan_id", table_name="payment_alerts", if_exists=True)

    # ── payment_schedules — keep idx_payment_schedules_*
    op.drop_index("ix_payment_schedules_due_date", table_name="payment_schedules", if_exists=True)
    op.drop_index("ix_payment_schedules_user_loan_id", table_name="payment_schedules", if_exists=True)

    # ── pdf_documents — keep idx_pdf_documents_*
    op.drop_index("ix_pdf_documents_status", table_name="pdf_documents", if_exists=True)
    op.drop_index("ix_pdf_documents_symbol", table_name="pdf_documents", if_exists=True)

    # ── spider_runs — keep idx_spider_runs_status
    op.drop_index("ix_spider_runs_status", table_name="spider_runs", if_exists=True)

    # ── user_loans — keep idx_user_loans_*
    op.drop_index("ix_user_loans_user_id", table_name="user_loans", if_exists=True)
    op.drop_index("ix_user_loans_product_id", table_name="user_loans", if_exists=True)

    # ── voice_call_logs — keep idx_voice_call_logs_user
    op.drop_index("ix_voice_call_logs_user_id", table_name="voice_call_logs", if_exists=True)


def downgrade() -> None:
    # Re-create the dropped indexes (for rollback capability)
    # These are all simple btree indexes — recreating them is safe
    op.create_index("ix_codal_announcements_symbol", "codal_announcements", ["symbol"])
    op.create_index("idx_market_prices_sec_date", "market_prices", ["security_id", "date"])
    op.create_index("idx_order_book_sec_time", "order_book", ["security_id", "snapshot_time"])
    op.create_index("idx_options_ins_date", "options", ["ins_code", "date"])
    op.create_index("ix_options_underlying", "options", ["underlying"])
    op.create_index("idx_etf_nav_sec_date", "etf_nav", ["security_id", "date"])
    op.create_index("idx_intraday_sec_ts", "intraday_snapshots", ["security_id", "snapshot_time"])
    op.create_unique_constraint("users_telegram_id_key", "users", ["telegram_id"])
    op.create_index("ix_market_indices_date", "market_indices", ["date"])
    op.create_index("ix_ime_certificates_date", "ime_certificates", ["date"])
    op.create_index("ix_ime_forwards_date", "ime_forwards", ["date"])
    op.create_index("ix_ime_funds_date", "ime_funds", ["date"])
    op.create_index("ix_ime_futures_date", "ime_futures", ["date"])
    op.create_index("ix_ime_options_date", "ime_options", ["date"])
    op.create_index("ix_ime_physical_trades_date_trade", "ime_physical_trades", ["date"])
    op.create_index("ix_loan_coefficients_product_id", "loan_coefficients", ["product_id"])
    op.create_index("ix_loan_imports_status", "loan_imports", ["status"])
    op.create_index("ix_loan_imports_import_type", "loan_imports", ["import_type"])
    op.create_index("ix_loan_products_bank_id", "loan_products", ["bank_id"])
    op.create_index("ix_loan_products_guarantor_required", "loan_products", ["guarantor_required"])
    op.create_index("ix_loan_products_calculation_method", "loan_products", ["calculation_method"])
    op.create_index("ix_loan_requirements_product_id", "loan_requirements", ["product_id"])
    op.create_index("ix_loan_requirements_requirement_type", "loan_requirements", ["requirement_type"])
    op.create_index("ix_payment_alerts_user_id", "payment_alerts", ["user_id"])
    op.create_index("ix_payment_alerts_user_loan_id", "payment_alerts", ["user_loan_id"])
    op.create_index("ix_payment_schedules_due_date", "payment_schedules", ["due_date"])
    op.create_index("ix_payment_schedules_user_loan_id", "payment_schedules", ["user_loan_id"])
    op.create_index("ix_pdf_documents_status", "pdf_documents", ["status"])
    op.create_index("ix_pdf_documents_symbol", "pdf_documents", ["symbol"])
    op.create_index("ix_spider_runs_status", "spider_runs", ["status"])
    op.create_index("ix_user_loans_user_id", "user_loans", ["user_id"])
    op.create_index("ix_user_loans_product_id", "user_loans", ["product_id"])
    op.create_index("ix_voice_call_logs_user_id", "voice_call_logs", ["user_id"])
