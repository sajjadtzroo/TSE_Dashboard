#!/bin/bash
set -e

# Restore historical data dump on first database initialization.
# This script runs ONLY when the PostgreSQL data volume is empty (first start).
# It looks for the dump file mounted at /app/data/ inside the container.

DUMP_FILE="/app/data/full_dump_20260222.sql.gz"

if [ ! -f "$DUMP_FILE" ]; then
    echo "[init] No historical dump found at $DUMP_FILE — skipping restore."
    exit 0
fi

echo "[init] Restoring historical data from $DUMP_FILE ..."

# The 01-enable-pgvector.sql already ran and created the database + extensions.
# The dump contains CREATE EXTENSION IF NOT EXISTS, so duplicates are safe.
# Use --single-transaction to restore atomically.
gunzip -c "$DUMP_FILE" \
    | psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --single-transaction 2>&1 \
    | tail -5

echo "[init] Historical data restore complete."
