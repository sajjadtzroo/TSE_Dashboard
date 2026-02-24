#!/usr/bin/env bash
# Logs full system status every 30 minutes to data/status_monitor.log

PROJECT_DIR="/d/Bourse/main"
LOG="$PROJECT_DIR/data/status_monitor.log"
PARSE_RUN="20260223_183928_263e7b"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

while true; do
    log "────────────────────────────────────────────"

    # Codal processing stats
    STATS=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T db \
        psql -U postgres -d tsetmc -t -c "
        SELECT
          COUNT(*) FILTER (WHERE is_processed=true),
          COUNT(*) FILTER (WHERE is_processed=false AND is_failed=false),
          COUNT(*) FILTER (WHERE is_failed=true)
        FROM codal_announcements;" 2>/dev/null | tr -d ' ')
    PROCESSED=$(echo "$STATS" | awk -F'|' '{print $1}')
    PENDING=$(echo "$STATS"   | awk -F'|' '{print $2}')
    FAILED=$(echo "$STATS"    | awk -F'|' '{print $3}')

    FS=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T db \
        psql -U postgres -d tsetmc -t -c \
        "SELECT COUNT(*) FROM financial_statements;" 2>/dev/null | tr -d ' ')

    log "Codal: processed=$PROCESSED  pending=$PENDING  failed=$FAILED"
    log "Financial statements: $FS"

    # Parser status
    PARSER_STATUS=$(cd "$PROJECT_DIR" && \
        python scripts/run_codal_parallel.py --status "$PARSE_RUN" 2>&1 | \
        grep -E "running|completed|failed" | tail -3)
    log "Parsers: $PARSER_STATUS"

    # Docker container health
    CONTAINERS=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" ps \
        --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | \
        grep -v "^NAME" | awk '{print $1"="$2}' | tr '\n' ' ')
    log "Containers: $CONTAINERS"

    # Monitor pipeline status
    PIPELINE=$(tail -2 "$PROJECT_DIR/data/monitor_and_dump.log" 2>/dev/null | tr '\n' ' ')
    log "Pipeline: $PIPELINE"

    log "────────────────────────────────────────────"
    sleep 1800  # 30 minutes
done
