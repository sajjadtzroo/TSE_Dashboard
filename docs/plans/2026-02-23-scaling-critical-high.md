# Scaling Critical + High Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the three critical/high-priority scaling changes from `docs/scaling-10k.md` that eliminate the worst bottlenecks before any user load increase.

**Architecture:** Three independent, zero-downtime-or-near-zero changes: (1) a new Alembic migration adds the missing `codal_announcements` index using `CONCURRENTLY` so it does not lock the table; (2) `work_mem` is reduced in `postgresql.conf` to prevent OOM under parallel queries — requires a manual PostgreSQL reload; (3) the async SQLAlchemy pool is resized to match PgBouncer's `default_pool_size`, eliminating connection queuing under peak load.

**Tech Stack:** PostgreSQL 16, Alembic, SQLAlchemy 2 async, Docker Compose

---

### Task 1: Add `idx_codal_created_at` via Alembic migration

**Files:**
- Create: `alembic/versions/016_add_codal_created_at_index.py`

**Context:**
- `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Alembic wraps migrations in a transaction by default. We must switch the connection to AUTOCOMMIT before issuing the statement.
- Previous revision: `015_fix_codal_pdf_urls`
- There is no existing index on `codal_announcements(created_at)` — confirmed by reviewing migrations 001–015.

**Step 1: Create the migration file**

```python
"""Add idx_codal_created_at for announcement query performance

Revision ID: 016_add_codal_created_at_index
Revises: 015_fix_codal_pdf_urls
Create Date: 2026-02-23
"""

from typing import Sequence, Union

from alembic import op

revision: str = "016_add_codal_created_at_index"
down_revision: Union[str, None] = "015_fix_codal_pdf_urls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CONCURRENTLY cannot run inside a transaction — switch to autocommit
    conn = op.get_bind()
    conn.execution_options(isolation_level="AUTOCOMMIT")
    conn.execute(
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_codal_created_at "
        "ON codal_announcements(created_at DESC NULLS LAST)"
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execution_options(isolation_level="AUTOCOMMIT")
    conn.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_codal_created_at")
```

**Step 2: Verify migration chain is correct**

Run:
```bash
docker compose exec app alembic history | head -5
```
Expected: `015_fix_codal_pdf_urls` is the current head (last line before `(head)`).

**Step 3: Apply migration**

Run:
```bash
docker compose exec app alembic upgrade head
```
Expected output includes: `Running upgrade 015_fix_codal_pdf_urls -> 016_add_codal_created_at_index`

**Step 4: Verify index was created**

Run:
```bash
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "\d codal_announcements" | grep created_at
```
Expected: `idx_codal_created_at` appears in the index list.

**Step 5: Commit**

```bash
git add alembic/versions/016_add_codal_created_at_index.py
git commit -m "perf(db): add idx_codal_created_at — fixes 133ms seq scan on codal_announcements"
```

---

### Task 2: Reduce `work_mem` in `postgresql.conf`

**Files:**
- Modify: `infra/postgres/postgresql.conf:12`

**Context:**
- Current value: `work_mem = 32MB`
- `max_parallel_workers_per_gather = 4`, so worst case per query = 4 × 32MB = 128MB
- Under 1,200 concurrent sessions this risks OOM. Reducing to 16MB caps worst case at 64MB/query.
- This file is mounted into the `db` container. The change takes effect after `SELECT pg_reload_conf()` — **no full restart needed**.

**Step 1: Change the value**

In `infra/postgres/postgresql.conf`, find line 12:
```ini
work_mem = 32MB
```
Replace with:
```ini
work_mem = 16MB                # reduced from 32MB: 4 parallel workers × 16MB = 64MB max/query (safe at 1200 sessions)
                               # RELOAD REQUIRED: run `docker compose exec db psql -U $POSTGRES_USER -c "SELECT pg_reload_conf();"` or restart db service
```

**Step 2: Reload PostgreSQL config (without restart)**

Run:
```bash
docker compose exec db psql -U "$POSTGRES_USER" -c "SELECT pg_reload_conf();"
```
Expected: `pg_reload_conf` returns `t`.

**Step 3: Confirm the change is live**

Run:
```bash
docker compose exec db psql -U "$POSTGRES_USER" -c "SHOW work_mem;"
```
Expected: `16MB`

**Step 4: Commit**

```bash
git add infra/postgres/postgresql.conf
git commit -m "perf(db): reduce work_mem 32MB -> 16MB — safe under parallel load at 1200 concurrent sessions"
```

---

### Task 3: Resize async SQLAlchemy pool to match PgBouncer capacity

**Files:**
- Modify: `database/connection.py:178-185`

**Context:**
- `AsyncDatabaseManager.initialize()` currently sets `pool_size=20, max_overflow=40` (60 total possible connections).
- PgBouncer is configured with `default_pool_size=40`. Having `pool_size=20` means only 20 warm connections — the rest require wait time under load.
- Correct alignment: `pool_size=40` (matches PgBouncer's pool), `max_overflow=10` (small burst buffer).
- Total max connections to PgBouncer: 50, well within `max_client_conn=2000` (current) and safe under planned `5000`.
- The sync `DatabaseManager` (Scrapy) is not changed — it handles batch jobs, not concurrent user requests.

**Step 1: Update `AsyncDatabaseManager.initialize()`**

In `database/connection.py`, find the `create_async_engine` call (lines ~178–185):
```python
self.engine = create_async_engine(
    self.database_url,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_timeout=10,
    echo=False,
)
```
Replace with:
```python
self.engine = create_async_engine(
    self.database_url,
    pool_size=40,       # matches PgBouncer default_pool_size — 40 warm connections always ready
    max_overflow=10,    # small burst buffer; total max = 50, within PgBouncer limits
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_timeout=10,
    echo=False,
)
```

**Step 2: Restart the app container to pick up the change**

Run:
```bash
docker compose restart app
```

**Step 3: Verify pool config is live**

Run:
```bash
docker compose logs app | grep -i "pool\|database\|async" | tail -10
```
Expected: No connection errors on startup.

**Step 4: Spot-check active connections via PgBouncer**

Run:
```bash
docker compose exec pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```
Expected: `cl_active` and `sv_active` values are non-zero and `cl_waiting = 0` under normal load.

**Step 5: Commit**

```bash
git add database/connection.py
git commit -m "perf(db): resize async pool_size 20->40 to match PgBouncer default_pool_size"
```

---

## Summary of Changes

| Task | File | Risk | Downtime |
|------|------|------|----------|
| 1 | `alembic/versions/016_add_codal_created_at_index.py` | Low — CONCURRENTLY | None |
| 2 | `infra/postgres/postgresql.conf` | Low — reload only | None (reload, not restart) |
| 3 | `database/connection.py` | Low — config change | ~5s (app restart) |

**Expected outcome after all three:** Codal query latency drops from 133ms → ~2ms; peak DB connection pressure reduced; no OOM risk under 1,200 concurrent sessions.
