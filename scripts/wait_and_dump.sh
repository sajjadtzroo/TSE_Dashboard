#!/bin/bash
HISTORY_LOG="/d/Bourse/main/logs/history_backfill.log"
SHAREHOLDERS_LOG="/d/Bourse/main/logs/shareholders.log"

echo "[monitor] $(date '+%H:%M:%S') Waiting for both spiders to finish..."

while true; do
  sleep 30
  
  HIST_DONE=0
  SHARE_DONE=0
  grep -q "Spider closed" "$HISTORY_LOG" 2>/dev/null && HIST_DONE=1
  grep -q "Spider closed" "$SHAREHOLDERS_LOG" 2>/dev/null && SHARE_DONE=1
  
  echo "[monitor] $(date '+%H:%M:%S') history_backfill closed=$HIST_DONE, shareholders closed=$SHARE_DONE"
  
  if [ "$HIST_DONE" -eq 1 ] && [ "$SHARE_DONE" -eq 1 ]; then
    echo "[monitor] Both spiders finished! Taking final dump..."
    cd /d/Bourse/main
    python scripts/run_all_spiders.py --dump-only
    echo "[monitor] Dump complete at $(date '+%H:%M:%S')!"
    break
  fi
done
