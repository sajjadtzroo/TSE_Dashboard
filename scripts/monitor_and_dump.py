"""
monitor_and_dump.py
~~~~~~~~~~~~~~~~~~~
Polls history_backfill and shareholders log files until both show
"Spider closed", then takes a pg_dump and restarts uvicorn.
"""
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HISTORY_LOG = ROOT / "logs" / "history_backfill.log"
SHAREHOLDERS_LOG = ROOT / "logs" / "shareholders.log"


def log_closed(path: Path) -> bool:
    try:
        return "Spider closed" in path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return False


def ts():
    return datetime.now().strftime("%H:%M:%S")


print(f"[{ts()}] Monitor started. Waiting for both spiders to finish...")

while True:
    time.sleep(30)
    hist_done = log_closed(HISTORY_LOG)
    share_done = log_closed(SHAREHOLDERS_LOG)
    print(f"[{ts()}] history_backfill={'done' if hist_done else 'running'}, "
          f"shareholders={'done' if share_done else 'running'}")

    if hist_done and share_done:
        print(f"[{ts()}] Both spiders finished! Taking dump...")
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "run_all_spiders.py"), "--dump-only"],
            cwd=str(ROOT),
        )
        if result.returncode == 0:
            print(f"[{ts()}] Dump complete!")
        else:
            print(f"[{ts()}] Dump FAILED (rc={result.returncode})")
        break

print(f"[{ts()}] Monitor exiting.")
