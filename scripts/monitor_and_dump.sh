#!/usr/bin/env bash
# Monitor parse run, then top-up scrape, then dump
set -e

RUN_ID="20260224_114634_ca9bbd"
PROJECT_DIR="/d/Bourse/main"
LOG="$PROJECT_DIR/data/monitor_and_dump.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== Monitor & Dump pipeline started ==="
log "Monitoring parse run: $RUN_ID"

# ── Step 1: Wait for parsers to finish ───────────────────────────────────────
while true; do
    STATUS=$(cd "$PROJECT_DIR" && python scripts/run_codal_parallel.py --status "$RUN_ID" 2>&1)
    RUNNING=$(echo "$STATUS" | grep -c "running" || true)
    FAILED=$(echo "$STATUS"  | grep -c "failed"  || true)
    DONE=$(echo "$STATUS"    | grep -c "completed" || true)

    PROCESSED=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T db \
        psql -U postgres -d tsetmc -t -c \
        "SELECT COUNT(*) FILTER (WHERE is_processed=true) FROM codal_announcements;" \
        2>/dev/null | tr -d ' ')

    log "Parsers running=$RUNNING completed=$DONE failed=$FAILED | DB processed=$PROCESSED"

    if [ "$RUNNING" -eq 0 ]; then
        log "All parsers stopped (completed or failed). Moving to step 2."
        break
    fi

    sleep 300  # check every 5 minutes
done

# ── Step 2: Top-up scrape (recent 3 months only) ─────────────────────────────
log "=== Step 2: Top-up scrape (recent announcements) ==="
cd "$PROJECT_DIR"
TOP_UP_RUN=$(python scripts/run_codal_parallel.py --scrapers 5 --parsers 5 2>&1 | grep "Run ID\|run_id" | head -1 || true)
log "Top-up scrape started. $TOP_UP_RUN"

# Wait for top-up to finish
sleep 30
TOP_UP_ID=$(ls -t data/codal_jobs/ | grep -v runs.json | head -1)
log "Top-up run ID: $TOP_UP_ID"

while true; do
    STATUS=$(python scripts/run_codal_parallel.py --status "$TOP_UP_ID" 2>&1)
    RUNNING=$(echo "$STATUS" | grep -c "running" || true)
    log "Top-up: running=$RUNNING"
    [ "$RUNNING" -eq 0 ] && break
    sleep 120
done
log "Top-up scrape finished."

# ── Step 3: Database dump ─────────────────────────────────────────────────────
log "=== Step 3: Taking database dump ==="
DUMP_FILE="$PROJECT_DIR/data/full_dump_$(date '+%Y%m%d_%H%M').sql"
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T db \
    pg_dump -U postgres tsetmc > "$DUMP_FILE"
log "Dump written to $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

gzip "$DUMP_FILE"
log "Compressed: ${DUMP_FILE}.gz ($(du -h "${DUMP_FILE}.gz" | cut -f1))"
rm -f "$PROJECT_DIR/data/full_dump_20260221_v2.sql.gz"  # remove old dump
log "Old dump removed."

log "=== Pipeline complete ==="
