# Database Architecture Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `DailyOHLCV` into 3 normalized tables and introduce a `database/repositories/` layer so all queries go through typed, testable repository classes instead of inline SQLAlchemy in route handlers.

**Architecture:** `DailyOHLCV` (40+ col god table) → `DailyPrices` (OHLCV + price context, partitioned by year) + `DailyFundamentals` (EPS, PE, market cap) + `DailyClientType` (real/legal buy/sell). All routes query via `XRepository` classes that accept a `Session` via FastAPI `Depends`. Zero API downtime via shadow tables + dual-write + phased cutover.

**Tech Stack:** SQLAlchemy (sync, `declarative_base`), PostgreSQL 16 with range partitioning, Alembic for migrations, pytest for tests.

**Design doc:** `docs/plans/2026-02-19-db-architecture-overhaul-design.md`

---

## Background: How Things Work Today

- **Session injection**: Routes use `db: Session = Depends(get_db)` from `api/deps.py` (sync)
- **Existing query pattern**: `db.query(DailyOHLCV).filter(...).order_by(...).limit(n).all()`
- **Spider writes**: `insert(DailyOHLCV).on_conflict_do_update(index_elements=['security_id','date'], ...)` via scoped sync session
- **Models base**: `Base = declarative_base()` in `database/models.py` — all models inherit from it
- **Unique constraint on DailyOHLCV**: `(security_id, date)` — becomes composite PK on new tables
- **`lazy='raise'`**: Used on `Security.daily_ohlcv` to prevent accidental N+1 — new relationships get the same treatment

---

## Phase 1 — Foundation (Tasks 1–6)

### Task 1: Add 3 new ORM models to models.py

**Files:**
- Modify: `database/models.py` (add after `DailyOHLCV` class)
- Test: `tests/database/test_new_models.py` (create)

**Step 1: Write the failing test**

```python
# tests/database/test_new_models.py
import pytest
from sqlalchemy import inspect
from database.models import DailyPrices, DailyFundamentals, DailyClientType

def test_daily_prices_has_required_columns():
    mapper = inspect(DailyPrices)
    cols = {c.key for c in mapper.column_attrs}
    assert {"security_id", "date", "open", "high", "low", "close", "last",
            "volume", "value", "trades"}.issubset(cols)

def test_daily_fundamentals_has_required_columns():
    mapper = inspect(DailyFundamentals)
    cols = {c.key for c in mapper.column_attrs}
    assert {"security_id", "date", "eps", "pe_ratio", "market_cap", "nav"}.issubset(cols)

def test_daily_client_type_has_required_columns():
    mapper = inspect(DailyClientType)
    cols = {c.key for c in mapper.column_attrs}
    assert {"security_id", "date", "real_buy_count", "real_buy_volume",
            "legal_buy_count", "legal_buy_volume"}.issubset(cols)
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/database/test_new_models.py -v
```
Expected: `ImportError: cannot import name 'DailyPrices'`

**Step 3: Add the 3 models to database/models.py**

Add after the existing `DailyOHLCV` class:

```python
class DailyPrices(Base):
    """OHLCV + price context. Partitioned by year (done in migration 005)."""
    __tablename__ = "daily_prices"
    __table_args__ = (
        UniqueConstraint("security_id", "date", name="uq_daily_prices_sec_date"),
        # Partition declaration (PostgreSQL sees the parent table here)
        {"postgresql_partition_by": "RANGE (date)"},
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer, ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    date = Column(Date, nullable=False, index=True)
    open = Column(Numeric(18, 2))
    high = Column(Numeric(18, 2))
    low = Column(Numeric(18, 2))
    close = Column(Numeric(18, 2))
    last = Column(Numeric(18, 2))
    adj_close = Column(Numeric(18, 2))
    price_yesterday = Column(Numeric(18, 2))
    close_change = Column(Numeric(18, 2))
    close_change_pct = Column(Numeric(18, 4))
    last_change = Column(Numeric(18, 2))
    last_change_pct = Column(Numeric(18, 4))
    threshold_min = Column(Numeric(18, 2))
    threshold_max = Column(Numeric(18, 2))
    volume = Column(BigInteger)
    value = Column(BigInteger)
    trades = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    security = relationship("Security", back_populates="daily_prices", lazy="raise")


class DailyFundamentals(Base):
    """EPS, PE ratio, market cap, NAV — updated less frequently than prices."""
    __tablename__ = "daily_fundamentals"
    __table_args__ = (
        UniqueConstraint("security_id", "date", name="uq_daily_fundamentals_sec_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer, ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    date = Column(Date, nullable=False, index=True)
    eps = Column(Numeric(18, 2))
    pe_ratio = Column(Numeric(18, 2))
    market_cap = Column(BigInteger)
    nav = Column(Numeric(18, 2))
    estimated_eps = Column(Numeric(18, 2))
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    security = relationship("Security", back_populates="daily_fundamentals", lazy="raise")


class DailyClientType(Base):
    """Real vs legal investor buy/sell counts and volumes."""
    __tablename__ = "daily_client_type"
    __table_args__ = (
        UniqueConstraint("security_id", "date", name="uq_daily_client_type_sec_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer, ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    date = Column(Date, nullable=False, index=True)
    real_buy_count = Column(Integer)
    real_buy_volume = Column(BigInteger)
    real_sell_count = Column(Integer)
    real_sell_volume = Column(BigInteger)
    legal_buy_count = Column(Integer)
    legal_buy_volume = Column(BigInteger)
    legal_sell_count = Column(Integer)
    legal_sell_volume = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    security = relationship("Security", back_populates="daily_client_type", lazy="raise")
```

Also add reverse relationships on `Security` (in the Security class body):
```python
daily_prices = relationship("DailyPrices", lazy="raise", cascade="all, delete-orphan")
daily_fundamentals = relationship("DailyFundamentals", lazy="raise", cascade="all, delete-orphan")
daily_client_type = relationship("DailyClientType", lazy="raise", cascade="all, delete-orphan")
```

**Step 4: Run tests to verify they pass**

```bash
pytest tests/database/test_new_models.py -v
```
Expected: `3 passed`

**Step 5: Commit**

```bash
git add database/models.py tests/database/test_new_models.py
git commit -m "feat: add DailyPrices, DailyFundamentals, DailyClientType models"
```

---

### Task 2: Alembic migration 005 — create shadow tables + year partitions

**Files:**
- Create: `alembic/versions/005_create_daily_prices_shadow.py`

**Step 1: Generate the migration stub**

```bash
alembic revision --autogenerate -m "create_daily_prices_shadow"
```
This creates a file in `alembic/versions/`. Rename it to `005_create_daily_prices_shadow.py`.

**Step 2: Replace the auto-generated body with the full implementation**

```python
"""create daily_prices, daily_fundamentals, daily_client_type shadow tables

Revision ID: 005
Revises: 004
Create Date: 2026-02-19
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"  # Update to match actual 004 revision ID
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. Parent partitioned table ──────────────────────────────────────────
    op.execute("""
        CREATE TABLE daily_prices (
            id          BIGSERIAL,
            security_id INTEGER NOT NULL REFERENCES securities(security_id) ON DELETE CASCADE,
            date        DATE NOT NULL,
            open        NUMERIC(18,2),
            high        NUMERIC(18,2),
            low         NUMERIC(18,2),
            close       NUMERIC(18,2),
            last        NUMERIC(18,2),
            adj_close   NUMERIC(18,2),
            price_yesterday   NUMERIC(18,2),
            close_change      NUMERIC(18,2),
            close_change_pct  NUMERIC(18,4),
            last_change       NUMERIC(18,2),
            last_change_pct   NUMERIC(18,4),
            threshold_min     NUMERIC(18,2),
            threshold_max     NUMERIC(18,2),
            volume      BIGINT,
            value       BIGINT,
            trades      INTEGER,
            created_at  TIMESTAMPTZ DEFAULT now(),
            updated_at  TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_daily_prices_sec_date UNIQUE (security_id, date)
        ) PARTITION BY RANGE (date)
    """)

    # ── 2. Year partitions (2018 → 2026) ─────────────────────────────────────
    for year in range(2018, 2027):
        op.execute(f"""
            CREATE TABLE daily_prices_{year}
            PARTITION OF daily_prices
            FOR VALUES FROM ('{year}-01-01') TO ('{year + 1}-01-01')
        """)

    # ── 3. daily_fundamentals ────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE daily_fundamentals (
            id          BIGSERIAL PRIMARY KEY,
            security_id INTEGER NOT NULL REFERENCES securities(security_id) ON DELETE CASCADE,
            date        DATE NOT NULL,
            eps               NUMERIC(18,2),
            pe_ratio          NUMERIC(18,2),
            market_cap        BIGINT,
            nav               NUMERIC(18,2),
            estimated_eps     NUMERIC(18,2),
            created_at  TIMESTAMPTZ DEFAULT now(),
            updated_at  TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_daily_fundamentals_sec_date UNIQUE (security_id, date)
        )
    """)

    # ── 4. daily_client_type ─────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE daily_client_type (
            id               BIGSERIAL PRIMARY KEY,
            security_id      INTEGER NOT NULL REFERENCES securities(security_id) ON DELETE CASCADE,
            date             DATE NOT NULL,
            real_buy_count   INTEGER,
            real_buy_volume  BIGINT,
            real_sell_count  INTEGER,
            real_sell_volume BIGINT,
            legal_buy_count  INTEGER,
            legal_buy_volume BIGINT,
            legal_sell_count  INTEGER,
            legal_sell_volume BIGINT,
            created_at  TIMESTAMPTZ DEFAULT now(),
            updated_at  TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_daily_client_type_sec_date UNIQUE (security_id, date)
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS daily_client_type CASCADE")
    op.execute("DROP TABLE IF EXISTS daily_fundamentals CASCADE")
    op.execute("DROP TABLE IF EXISTS daily_prices CASCADE")  # drops all partitions
```

**Step 3: Fix the `down_revision` to the real 004 revision ID**

```bash
# Find the actual revision ID of migration 004:
grep "^revision" alembic/versions/004_*.py
# Copy that value into down_revision in 005
```

**Step 4: Run the migration**

```bash
alembic upgrade 005
```
Expected: no errors. Verify:
```bash
alembic current  # should show 005
```

**Step 5: Spot-check the tables exist**

```bash
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt daily_*"
```
Expected: `daily_client_type`, `daily_fundamentals`, `daily_prices` (+ `daily_prices_2018` … `daily_prices_2026`)

**Step 6: Commit**

```bash
git add alembic/versions/005_create_daily_prices_shadow.py
git commit -m "feat: migration 005 — shadow tables for DailyPrices, DailyFundamentals, DailyClientType"
```

---

### Task 3: Write BaseRepository

**Files:**
- Create: `database/repositories/__init__.py`
- Create: `database/repositories/base.py`
- Test: `tests/database/test_base_repository.py`

**Step 1: Write the failing test**

```python
# tests/database/test_base_repository.py
import pytest
from unittest.mock import MagicMock, patch
from database.repositories.base import BaseRepository
from database.models import Security

class SecurityRepo(BaseRepository[Security]):
    model = Security

def test_base_repository_get_returns_none_when_not_found():
    session = MagicMock()
    session.get.return_value = None
    repo = SecurityRepo(session)
    result = repo.get(9999)
    assert result is None
    session.get.assert_called_once_with(Security, 9999)

def test_base_repository_list_applies_limit():
    session = MagicMock()
    mock_query = MagicMock()
    session.query.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.offset.return_value = mock_query
    mock_query.all.return_value = []

    repo = SecurityRepo(session)
    repo.list(limit=10, offset=0)
    mock_query.limit.assert_called_once_with(10)
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/database/test_base_repository.py -v
```
Expected: `ImportError: cannot import name 'BaseRepository'`

**Step 3: Implement BaseRepository**

```python
# database/repositories/__init__.py
from .daily_prices import DailyPricesRepository
from .daily_fundamentals import DailyFundamentalsRepository
from .daily_client_type import DailyClientTypeRepository

__all__ = [
    "DailyPricesRepository",
    "DailyFundamentalsRepository",
    "DailyClientTypeRepository",
]
```

```python
# database/repositories/base.py
from typing import Generic, TypeVar, Type
from sqlalchemy.orm import Session

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """Base class providing get/list over a SQLAlchemy ORM model.

    Usage:
        class DailyPricesRepository(BaseRepository[DailyPrices]):
            model = DailyPrices

        repo = DailyPricesRepository(db_session)
        row = repo.get(42)
    """
    model: Type[T]

    def __init__(self, session: Session):
        self.session = session

    def get(self, pk: int) -> T | None:
        return self.session.get(self.model, pk)

    def list(self, limit: int = 100, offset: int = 0) -> list[T]:
        return (
            self.session.query(self.model)
            .limit(limit)
            .offset(offset)
            .all()
        )
```

**Step 4: Run tests to verify they pass**

```bash
pytest tests/database/test_base_repository.py -v
```
Expected: `2 passed`

**Step 5: Commit**

```bash
git add database/repositories/ tests/database/test_base_repository.py
git commit -m "feat: add BaseRepository with get/list"
```

---

### Task 4: DailyPricesRepository

**Files:**
- Create: `database/repositories/daily_prices.py`
- Test: `tests/database/test_daily_prices_repository.py`

**Step 1: Write the failing tests**

```python
# tests/database/test_daily_prices_repository.py
import pytest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch
from database.repositories.daily_prices import DailyPricesRepository
from database.models import DailyPrices, Security


def _make_row(security_id=1, trading_date=None):
    row = MagicMock(spec=DailyPrices)
    row.security_id = security_id
    row.date = trading_date or date.today()
    row.close = 10000
    return row


def test_get_recent_queries_by_symbol():
    session = MagicMock()
    mock_q = MagicMock()
    session.query.return_value = mock_q
    mock_q.join.return_value = mock_q
    mock_q.filter.return_value = mock_q
    mock_q.order_by.return_value = mock_q
    mock_q.limit.return_value = mock_q
    mock_q.all.return_value = [_make_row()]

    repo = DailyPricesRepository(session)
    result = repo.get_recent(symbol="فولاد", days=30)

    assert len(result) == 1
    session.query.assert_called_once_with(DailyPrices)


def test_get_latest_date_returns_none_on_empty():
    session = MagicMock()
    mock_q = MagicMock()
    session.query.return_value = mock_q
    mock_q.scalar.return_value = None

    repo = DailyPricesRepository(session)
    result = repo.get_latest_date()

    assert result is None
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/database/test_daily_prices_repository.py -v
```
Expected: `ImportError`

**Step 3: Implement DailyPricesRepository**

```python
# database/repositories/daily_prices.py
from datetime import date
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from database.models import DailyPrices, Security
from database.repositories.base import BaseRepository


class DailyPricesRepository(BaseRepository[DailyPrices]):
    model = DailyPrices

    def get_recent(self, symbol: str, days: int = 30) -> list[DailyPrices]:
        """Most common route access pattern: last N days for a symbol."""
        return (
            self.session.query(DailyPrices)
            .join(Security, DailyPrices.security_id == Security.security_id)
            .filter(Security.symbol == symbol)
            .order_by(desc(DailyPrices.date))
            .limit(days)
            .all()
        )

    def get_latest_date(self) -> date | None:
        """Latest trading date in the table — used for cache warming."""
        return self.session.query(func.max(DailyPrices.date)).scalar()

    def get_by_date_range(
        self, symbol: str, start: date, end: date
    ) -> list[DailyPrices]:
        return (
            self.session.query(DailyPrices)
            .join(Security, DailyPrices.security_id == Security.security_id)
            .filter(
                Security.symbol == symbol,
                DailyPrices.date >= start,
                DailyPrices.date <= end,
            )
            .order_by(DailyPrices.date)
            .all()
        )

    def get_all_for_date(self, trading_date: date) -> list[DailyPrices]:
        """Used by dashboard overview: all securities for one date."""
        return (
            self.session.query(DailyPrices)
            .filter(DailyPrices.date == trading_date)
            .all()
        )

    def bulk_upsert(self, rows: list[dict]) -> int:
        """Upsert from spider pipeline. rows is a list of dicts with column values."""
        from sqlalchemy.dialects.postgresql import insert
        if not rows:
            return 0
        stmt = insert(DailyPrices).values(rows)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_daily_prices_sec_date",
            set_={c: stmt.excluded[c] for c in rows[0] if c not in ("security_id", "date")},
        )
        result = self.session.execute(stmt)
        self.session.commit()
        return result.rowcount
```

**Step 4: Run tests to verify they pass**

```bash
pytest tests/database/test_daily_prices_repository.py -v
```
Expected: `2 passed`

**Step 5: Update repositories/__init__.py to export it**

```python
# Add to database/repositories/__init__.py (already done in Task 3 if you followed it)
from .daily_prices import DailyPricesRepository
```

**Step 6: Commit**

```bash
git add database/repositories/daily_prices.py tests/database/test_daily_prices_repository.py
git commit -m "feat: add DailyPricesRepository with get_recent, get_latest_date, bulk_upsert"
```

---

### Task 5: DailyFundamentalsRepository + DailyClientTypeRepository

**Files:**
- Create: `database/repositories/daily_fundamentals.py`
- Create: `database/repositories/daily_client_type.py`
- Test: `tests/database/test_daily_fundamentals_repository.py`
- Test: `tests/database/test_daily_client_type_repository.py`

**Step 1: Write the failing tests**

```python
# tests/database/test_daily_fundamentals_repository.py
from unittest.mock import MagicMock
from database.repositories.daily_fundamentals import DailyFundamentalsRepository
from database.models import DailyFundamentals

def test_get_latest_returns_most_recent():
    session = MagicMock()
    mock_q = MagicMock()
    session.query.return_value = mock_q
    mock_q.filter.return_value = mock_q
    mock_q.order_by.return_value = mock_q
    mock_q.first.return_value = MagicMock(spec=DailyFundamentals)

    repo = DailyFundamentalsRepository(session)
    result = repo.get_latest(security_id=1)
    assert result is not None
```

```python
# tests/database/test_daily_client_type_repository.py
from unittest.mock import MagicMock
from database.repositories.daily_client_type import DailyClientTypeRepository
from database.models import DailyClientType

def test_get_for_date_returns_list():
    session = MagicMock()
    mock_q = MagicMock()
    session.query.return_value = mock_q
    mock_q.filter.return_value = mock_q
    mock_q.all.return_value = [MagicMock(spec=DailyClientType)]

    from datetime import date
    repo = DailyClientTypeRepository(session)
    result = repo.get_for_date(trading_date=date.today())
    assert len(result) == 1
```

**Step 2: Run tests to verify they fail**

```bash
pytest tests/database/test_daily_fundamentals_repository.py tests/database/test_daily_client_type_repository.py -v
```

**Step 3: Implement both repositories**

```python
# database/repositories/daily_fundamentals.py
from datetime import date
from sqlalchemy import desc
from sqlalchemy.orm import Session
from database.models import DailyFundamentals
from database.repositories.base import BaseRepository


class DailyFundamentalsRepository(BaseRepository[DailyFundamentals]):
    model = DailyFundamentals

    def get_latest(self, security_id: int) -> DailyFundamentals | None:
        return (
            self.session.query(DailyFundamentals)
            .filter(DailyFundamentals.security_id == security_id)
            .order_by(desc(DailyFundamentals.date))
            .first()
        )

    def bulk_upsert(self, rows: list[dict]) -> int:
        from sqlalchemy.dialects.postgresql import insert
        if not rows:
            return 0
        stmt = insert(DailyFundamentals).values(rows)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_daily_fundamentals_sec_date",
            set_={c: stmt.excluded[c] for c in rows[0] if c not in ("security_id", "date")},
        )
        result = self.session.execute(stmt)
        self.session.commit()
        return result.rowcount
```

```python
# database/repositories/daily_client_type.py
from datetime import date
from sqlalchemy import desc
from sqlalchemy.orm import Session
from database.models import DailyClientType
from database.repositories.base import BaseRepository


class DailyClientTypeRepository(BaseRepository[DailyClientType]):
    model = DailyClientType

    def get_for_date(self, trading_date: date) -> list[DailyClientType]:
        return (
            self.session.query(DailyClientType)
            .filter(DailyClientType.date == trading_date)
            .all()
        )

    def get_recent(self, security_id: int, days: int = 30) -> list[DailyClientType]:
        return (
            self.session.query(DailyClientType)
            .filter(DailyClientType.security_id == security_id)
            .order_by(desc(DailyClientType.date))
            .limit(days)
            .all()
        )

    def bulk_upsert(self, rows: list[dict]) -> int:
        from sqlalchemy.dialects.postgresql import insert
        if not rows:
            return 0
        stmt = insert(DailyClientType).values(rows)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_daily_client_type_sec_date",
            set_={c: stmt.excluded[c] for c in rows[0] if c not in ("security_id", "date")},
        )
        result = self.session.execute(stmt)
        self.session.commit()
        return result.rowcount
```

**Step 4: Run tests**

```bash
pytest tests/database/test_daily_fundamentals_repository.py tests/database/test_daily_client_type_repository.py -v
```
Expected: `2 passed`

**Step 5: Update repositories/__init__.py**

```python
# database/repositories/__init__.py
from .daily_prices import DailyPricesRepository
from .daily_fundamentals import DailyFundamentalsRepository
from .daily_client_type import DailyClientTypeRepository

__all__ = [
    "DailyPricesRepository",
    "DailyFundamentalsRepository",
    "DailyClientTypeRepository",
]
```

**Step 6: Commit**

```bash
git add database/repositories/ tests/database/
git commit -m "feat: add DailyFundamentalsRepository and DailyClientTypeRepository"
```

---

### Task 6: Alembic migration 007 — add indexes

**Files:**
- Create: `alembic/versions/007_add_daily_prices_indexes.py`

> Note: Migration 006 (backfill) comes after dual-write is enabled (Phase 2). Indexes go in 007 so they can be applied before dual-write, making inserts slightly slower but reads immediately faster.

**Step 1: Create the migration file manually**

```python
# alembic/versions/007_add_daily_prices_indexes.py
"""Add indexes for daily_prices, daily_fundamentals, daily_client_type

Revision ID: 007
Revises: 005
Create Date: 2026-02-19
"""
from alembic import op

revision = "007"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    # Daily prices — most common access: recent data for a symbol
    op.create_index(
        "idx_daily_prices_symbol_date",
        "daily_prices", ["security_id", "date"],
        postgresql_ops={"date": "DESC"}
    )
    op.create_index("idx_daily_prices_date", "daily_prices", ["date"],
                    postgresql_ops={"date": "DESC"})

    # Fundamentals — PE/EPS screening by date
    op.create_index("idx_daily_fundamentals_date", "daily_fundamentals", ["date"],
                    postgresql_ops={"date": "DESC"})

    # Client type — money flow analysis for a symbol
    op.create_index(
        "idx_daily_client_type_symbol_date",
        "daily_client_type", ["security_id", "date"],
        postgresql_ops={"date": "DESC"}
    )


def downgrade():
    op.drop_index("idx_daily_client_type_symbol_date", table_name="daily_client_type")
    op.drop_index("idx_daily_fundamentals_date", table_name="daily_fundamentals")
    op.drop_index("idx_daily_prices_date", table_name="daily_prices")
    op.drop_index("idx_daily_prices_symbol_date", table_name="daily_prices")
```

**Step 2: Fix down_revision to actual 005 revision ID, then run**

```bash
grep "^revision" alembic/versions/005_*.py  # copy value to down_revision in 007
alembic upgrade 007
alembic current  # verify
```

**Step 3: Commit**

```bash
git add alembic/versions/007_add_daily_prices_indexes.py
git commit -m "feat: migration 007 — add indexes on daily_prices, daily_fundamentals, daily_client_type"
```

---

## Phase 2 — Data Migration (Tasks 7–8)

### Task 7: Alembic migration 006 — batched backfill

**Files:**
- Create: `alembic/versions/006_backfill_daily_prices.py`
- Create: `tests/database/test_backfill.py`

**Step 1: Write a validation test (run AFTER backfill)**

```python
# tests/database/test_backfill.py
"""
Run these tests against a real DB after executing migration 006.
They assert new tables match DailyOHLCV row-for-row.

Usage:
    pytest tests/database/test_backfill.py -v --integration
"""
import pytest

@pytest.mark.integration
def test_daily_prices_row_count_matches_ohlcv(db_session):
    from sqlalchemy import text
    old = db_session.execute(text("SELECT COUNT(*) FROM daily_ohlcv")).scalar()
    new = db_session.execute(text("SELECT COUNT(*) FROM daily_prices")).scalar()
    assert new == old, f"Row count mismatch: daily_ohlcv={old}, daily_prices={new}"

@pytest.mark.integration
def test_daily_prices_checksum_matches_ohlcv(db_session):
    from sqlalchemy import text
    old_sum = db_session.execute(
        text("SELECT SUM(close::numeric) FROM daily_ohlcv WHERE close IS NOT NULL")
    ).scalar()
    new_sum = db_session.execute(
        text("SELECT SUM(close::numeric) FROM daily_prices WHERE close IS NOT NULL")
    ).scalar()
    assert abs((old_sum or 0) - (new_sum or 0)) < 0.01, \
        f"Checksum mismatch: old={old_sum}, new={new_sum}"
```

**Step 2: Create the backfill migration**

```python
# alembic/versions/006_backfill_daily_prices.py
"""Backfill daily_prices, daily_fundamentals, daily_client_type from daily_ohlcv

Revision ID: 006
Revises: 005
Create Date: 2026-02-19
"""
import time
from alembic import op
from sqlalchemy import text

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None

BATCH_SIZE = 1000
SLEEP_BETWEEN_BATCHES = 0.1  # seconds — prevents lock contention


def upgrade():
    conn = op.get_bind()

    # ── Backfill daily_prices ────────────────────────────────────────────────
    total = conn.execute(text("SELECT COUNT(*) FROM daily_ohlcv")).scalar()
    print(f"\n[006] Backfilling daily_prices: {total:,} rows in batches of {BATCH_SIZE}")

    offset = 0
    while True:
        result = conn.execute(text(f"""
            INSERT INTO daily_prices
                (security_id, date, open, high, low, close, last, adj_close,
                 price_yesterday, close_change, close_change_pct,
                 last_change, last_change_pct, threshold_min, threshold_max,
                 volume, value, trades, created_at, updated_at)
            SELECT
                security_id, date, open, high, low, close, last, adj_close,
                price_yesterday, close_change, close_change_pct,
                last_change, last_change_pct, threshold_min, threshold_max,
                volume, value, trades, created_at, updated_at
            FROM daily_ohlcv
            ORDER BY id
            LIMIT {BATCH_SIZE} OFFSET {offset}
            ON CONFLICT (security_id, date) DO NOTHING
        """))
        rows_inserted = result.rowcount
        if rows_inserted == 0:
            break
        offset += BATCH_SIZE
        print(f"  daily_prices: {offset:,}/{total:,} rows processed")
        time.sleep(SLEEP_BETWEEN_BATCHES)

    # ── Backfill daily_fundamentals ──────────────────────────────────────────
    conn.execute(text("""
        INSERT INTO daily_fundamentals
            (security_id, date, eps, pe_ratio, market_cap, nav, estimated_eps)
        SELECT
            security_id, date, eps, pe_ratio, market_cap, nav, estimated_eps
        FROM daily_ohlcv
        ON CONFLICT (security_id, date) DO NOTHING
    """))
    # Fundamentals table is small enough to do in one shot (no LIMIT needed)

    # ── Backfill daily_client_type ───────────────────────────────────────────
    conn.execute(text("""
        INSERT INTO daily_client_type
            (security_id, date,
             real_buy_count, real_buy_volume, real_sell_count, real_sell_volume,
             legal_buy_count, legal_buy_volume, legal_sell_count, legal_sell_volume)
        SELECT
            security_id, date,
            real_buy_count, real_buy_volume, real_sell_count, real_sell_volume,
            legal_buy_count, legal_buy_volume, legal_sell_count, legal_sell_volume
        FROM daily_ohlcv
        ON CONFLICT (security_id, date) DO NOTHING
    """))

    print("[006] Backfill complete.")


def downgrade():
    conn = op.get_bind()
    conn.execute(text("TRUNCATE daily_prices, daily_fundamentals, daily_client_type"))
```

**Step 3: Run the backfill migration**

```bash
alembic upgrade 006
```
Expected: progress logs, no errors. Takes 2-10 minutes depending on DB size.

**Step 4: Run validation tests**

```bash
pytest tests/database/test_backfill.py -v -m integration
```
Expected: `2 passed`

**Step 5: Commit**

```bash
git add alembic/versions/006_backfill_daily_prices.py tests/database/test_backfill.py
git commit -m "feat: migration 006 — batched backfill from DailyOHLCV to new tables"
```

---

### Task 8: Enable dual-write in spider pipeline

**Files:**
- Modify: `tsetmc_scraper/pipelines.py`

**Goal:** Spider pipeline writes to both `DailyOHLCV` (existing) AND the 3 new tables simultaneously. This runs for 48 hours before switching reads.

**Step 1: Locate the DailyOHLCV upsert in pipelines.py**

Look for the `insert(DailyOHLCV).on_conflict_do_update(...)` call. It will look like:

```python
from sqlalchemy.dialects.postgresql import insert
stmt = insert(DailyOHLCV).values(**row_data)
stmt = stmt.on_conflict_do_update(
    index_elements=["security_id", "date"],
    set_={...}
)
session.execute(stmt)
```

**Step 2: Add dual-write after the existing DailyOHLCV upsert**

```python
# After the existing DailyOHLCV upsert, add:
from database.models import DailyPrices, DailyFundamentals, DailyClientType
from database.repositories import (
    DailyPricesRepository, DailyFundamentalsRepository, DailyClientTypeRepository
)

# Dual-write: prices
prices_repo = DailyPricesRepository(session)
prices_repo.bulk_upsert([{
    "security_id": row_data["security_id"],
    "date": row_data["date"],
    "open": row_data.get("open"),
    "high": row_data.get("high"),
    "low": row_data.get("low"),
    "close": row_data.get("close"),
    "last": row_data.get("last"),
    "adj_close": row_data.get("adj_close"),
    "price_yesterday": row_data.get("price_yesterday"),
    "close_change": row_data.get("close_change"),
    "close_change_pct": row_data.get("close_change_pct"),
    "last_change": row_data.get("last_change"),
    "last_change_pct": row_data.get("last_change_pct"),
    "threshold_min": row_data.get("threshold_min"),
    "threshold_max": row_data.get("threshold_max"),
    "volume": row_data.get("volume"),
    "value": row_data.get("value"),
    "trades": row_data.get("trades"),
}])

# Dual-write: fundamentals
fund_repo = DailyFundamentalsRepository(session)
fund_repo.bulk_upsert([{
    "security_id": row_data["security_id"],
    "date": row_data["date"],
    "eps": row_data.get("eps"),
    "pe_ratio": row_data.get("pe_ratio"),
    "market_cap": row_data.get("market_cap"),
    "nav": row_data.get("nav"),
    "estimated_eps": row_data.get("estimated_eps"),
}])

# Dual-write: client type
ct_repo = DailyClientTypeRepository(session)
ct_repo.bulk_upsert([{
    "security_id": row_data["security_id"],
    "date": row_data["date"],
    "real_buy_count": row_data.get("real_buy_count"),
    "real_buy_volume": row_data.get("real_buy_volume"),
    "real_sell_count": row_data.get("real_sell_count"),
    "real_sell_volume": row_data.get("real_sell_volume"),
    "legal_buy_count": row_data.get("legal_buy_count"),
    "legal_buy_volume": row_data.get("legal_buy_volume"),
    "legal_sell_count": row_data.get("legal_sell_count"),
    "legal_sell_volume": row_data.get("legal_sell_volume"),
}])
```

**Step 3: Deploy and monitor for 48 hours**

Run the scheduler and observe that new scrapes populate both tables:

```bash
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT
        (SELECT COUNT(*) FROM daily_ohlcv WHERE date = CURRENT_DATE) AS ohlcv_today,
        (SELECT COUNT(*) FROM daily_prices WHERE date = CURRENT_DATE) AS prices_today;
"
```
Expected: both counts equal (or within 1-2 rows of each other).

**Step 4: Commit**

```bash
git add tsetmc_scraper/pipelines.py
git commit -m "feat: enable dual-write to new daily_prices/fundamentals/client_type tables"
```

---

## Phase 3 — Route Migration (Tasks 9–11)

> **Prerequisite**: 48 hours of dual-write monitoring complete, row counts match.

### Task 9: Migrate market.py routes to DailyPricesRepository

**Files:**
- Modify: `api/routes/market.py`
- Test: `tests/api/test_market_parity.py` (create)

**Step 1: Write smoke tests asserting API response parity**

```python
# tests/api/test_market_parity.py
"""
Smoke tests that assert API responses are identical before and after
switching routes from DailyOHLCV to DailyPricesRepository.

Run against a live app: pytest tests/api/test_market_parity.py --integration
"""
import pytest
import requests

BASE = "http://localhost:8000"

@pytest.mark.integration
@pytest.mark.parametrize("endpoint", [
    "/api/market/overview",
    "/api/market/indices",
])
def test_endpoint_returns_200(endpoint):
    r = requests.get(BASE + endpoint)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, (list, dict))

@pytest.mark.integration
def test_market_overview_has_required_keys():
    r = requests.get(BASE + "/api/market/overview")
    assert r.status_code == 200
    items = r.json()
    if items:
        item = items[0] if isinstance(items, list) else items
        # Assert keys that callers depend on
        assert "close" in item or "symbol" in item
```

**Step 2: Run smoke tests before touching routes (establish baseline)**

```bash
pytest tests/api/test_market_parity.py -v -m integration
```
Expected: `all passed` (baseline established)

**Step 3: Add a get_db_repo dependency to api/deps.py**

```python
# api/deps.py — add at the bottom

from database.repositories import (
    DailyPricesRepository, DailyFundamentalsRepository, DailyClientTypeRepository
)

def get_daily_prices_repo(db: Session = Depends(get_db)) -> DailyPricesRepository:
    return DailyPricesRepository(db)

def get_daily_fundamentals_repo(db: Session = Depends(get_db)) -> DailyFundamentalsRepository:
    return DailyFundamentalsRepository(db)

def get_daily_client_type_repo(db: Session = Depends(get_db)) -> DailyClientTypeRepository:
    return DailyClientTypeRepository(db)
```

**Step 4: Update market.py routes one endpoint at a time**

For each route that queries `DailyOHLCV`, replace the inline SQLAlchemy with a repository call.

Example conversion in `api/routes/market.py`:

```python
# Before:
@router.get("/overview")
def get_market_overview(db: Session = Depends(get_db)):
    rows = db.query(DailyOHLCV).join(Security, ...).filter(...).all()
    return [_map_row(r) for r in rows]

# After:
from api.deps import get_daily_prices_repo
from database.repositories import DailyPricesRepository

@router.get("/overview")
def get_market_overview(repo: DailyPricesRepository = Depends(get_daily_prices_repo)):
    rows = repo.get_all_for_date(repo.get_latest_date())
    return rows  # Repository returns the same shape — no manual mapping needed
```

Repeat for every endpoint in `market.py` that queries `DailyOHLCV`.

**Step 5: Run smoke tests again to confirm parity**

```bash
pytest tests/api/test_market_parity.py -v -m integration
```
Expected: `all passed` — same responses as baseline

**Step 6: Commit**

```bash
git add api/routes/market.py api/deps.py tests/api/test_market_parity.py
git commit -m "refactor: migrate market.py routes to DailyPricesRepository"
```

---

### Task 10: Migrate stocks.py and crypto.py

Follow the same pattern as Task 9:

1. Add a parity smoke test in `tests/api/test_stocks_parity.py` and `tests/api/test_crypto_parity.py`
2. Run baseline
3. Replace `db.query(DailyOHLCV)...` with `repo.get_recent(symbol, days)`
4. Run parity tests
5. Commit

```bash
git add api/routes/stocks.py api/routes/crypto.py tests/api/
git commit -m "refactor: migrate stocks.py and crypto.py routes to repositories"
```

---

### Task 11: Migrate loans.py + remove camelCase mappers

**Files:**
- Create: `database/repositories/loans.py`
- Modify: `api/routes/loans.py`
- Modify: `api/services_loans.py` (remove inline SQLAlchemy, keep orchestration only)

**Step 1: Create LoanRepository**

```python
# database/repositories/loans.py
from sqlalchemy.orm import Session
from database.models import LoanBank, LoanProduct, UserLoan
from database.repositories.base import BaseRepository


class LoanRepository(BaseRepository[LoanBank]):
    model = LoanBank

    def get_banks(self, active_only: bool = True) -> list[LoanBank]:
        q = self.session.query(LoanBank)
        if active_only:
            q = q.filter(LoanBank.is_active == True)
        return q.order_by(LoanBank.name).all()

    def get_products(self, bank_id: int) -> list[LoanProduct]:
        return (
            self.session.query(LoanProduct)
            .filter(LoanProduct.bank_id == bank_id)
            .all()
        )

    def get_user_loans(self, user_id: int) -> list[UserLoan]:
        return (
            self.session.query(UserLoan)
            .filter(UserLoan.user_id == user_id)
            .all()
        )
```

**Step 2: Remove the 5 camelCase mapper functions from loans.py**

Search `api/routes/loans.py` for `def _bank_to_camel`, `def _product_to_camel`, etc.

Delete all 5 functions. The response mapping should be in Pydantic schemas (`schemas_loans.py`) using `model_config = ConfigDict(populate_by_name=True)` and `alias_generator`.

If schemas don't have alias generators yet, add:

```python
# api/schemas_loans.py — add to LoanBankResponse
from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

class LoanBankResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    bank_id: int
    name: str
    # ... rest of fields
```

**Step 3: Commit**

```bash
git add database/repositories/loans.py api/routes/loans.py api/schemas_loans.py
git commit -m "refactor: add LoanRepository, remove hand-rolled camelCase mappers from loans.py"
```

---

## Phase 4 — Cutover & Cleanup (Tasks 12–14)

### Task 12: Alembic migration 008 — drop DailyOHLCV

> **Run only after**: 48h dual-write confirmed, all routes migrated, parity tests pass.

**Files:**
- Create: `alembic/versions/008_drop_daily_ohlcv.py`

```python
# alembic/versions/008_drop_daily_ohlcv.py
"""Drop daily_ohlcv — all data migrated to daily_prices/fundamentals/client_type

Revision ID: 008
Revises: 007
Create Date: 2026-02-19

WARNING: This migration is IRREVERSIBLE. Run only after:
- 48h dual-write monitoring
- All routes migrated to repositories
- Parity smoke tests passing
"""
from alembic import op
from sqlalchemy import text

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade():
    # Final safety check: row counts must match
    conn = op.get_bind()
    old_count = conn.execute(text("SELECT COUNT(*) FROM daily_ohlcv")).scalar()
    new_count = conn.execute(text("SELECT COUNT(*) FROM daily_prices")).scalar()
    if new_count < old_count * 0.99:
        raise RuntimeError(
            f"Safety check FAILED: daily_ohlcv has {old_count:,} rows "
            f"but daily_prices has only {new_count:,}. Aborting drop."
        )
    op.execute("DROP TABLE daily_ohlcv CASCADE")


def downgrade():
    raise NotImplementedError(
        "Migration 008 is irreversible. Restore from backup if needed."
    )
```

**Step 1: Run the migration**

```bash
alembic upgrade 008
```
Expected: row count check passes, table dropped.

**Step 2: Remove dual-write from pipeline**

Delete the dual-write block added in Task 8 from `tsetmc_scraper/pipelines.py`. Keep only the 3 repository upserts (remove the old `insert(DailyOHLCV)` call).

**Step 3: Commit**

```bash
git add alembic/versions/008_drop_daily_ohlcv.py tsetmc_scraper/pipelines.py
git commit -m "feat: migration 008 — drop DailyOHLCV after full cutover"
```

---

### Task 13: Update cache tags

The existing cache tag convention maps to spider names. Update to match new table names.

**Files:**
- Modify: `api/routes/market.py` (and any route that had `market_watch` cache tags)
- Modify: `api/cache.py` (if tag constants are defined there)

**Change**: Any `@cached(tags=["market_watch"])` that specifically cached `DailyOHLCV` data should now use `@cached(tags=["daily_prices"])`.

Spider-level invalidation in `tsetmc_scraper/pipelines.py` should call:
```python
cache_manager.invalidate_tags(["daily_prices", "daily_fundamentals", "daily_client_type"])
```
instead of only `["market_watch"]`.

**Commit:**

```bash
git add api/routes/ tsetmc_scraper/pipelines.py
git commit -m "chore: update cache tags to match new daily_prices/fundamentals/client_type tables"
```

---

### Task 14: Integration test suite — end-to-end validation

**Files:**
- Create: `tests/integration/test_db_layer.py`

```python
# tests/integration/test_db_layer.py
"""
End-to-end integration tests: spider pipeline → DB → API.
Run with: pytest tests/integration/ -m integration -v
Requires a running DB (docker compose up db).
"""
import pytest
from datetime import date
from database.repositories import DailyPricesRepository, DailyFundamentalsRepository


@pytest.mark.integration
def test_daily_prices_repo_get_recent(db_session):
    """Can query recent prices without touching DailyOHLCV."""
    repo = DailyPricesRepository(db_session)
    latest = repo.get_latest_date()
    assert latest is not None
    rows = repo.get_all_for_date(latest)
    assert len(rows) > 0
    assert hasattr(rows[0], "close")


@pytest.mark.integration
def test_daily_fundamentals_repo_get_latest(db_session):
    repo = DailyFundamentalsRepository(db_session)
    # Should not raise — SecurityID 1 should exist in any populated DB
    result = repo.get_latest(security_id=1)
    assert result is not None or result is None  # None is OK if ID 1 has no fundamentals


@pytest.mark.integration
def test_no_daily_ohlcv_table_exists(db_session):
    """Confirm old god table is gone after migration 008."""
    from sqlalchemy import text, inspect as sa_inspect
    inspector = sa_inspect(db_session.bind)
    tables = inspector.get_table_names()
    assert "daily_ohlcv" not in tables, "DailyOHLCV still exists — migration 008 not run?"


@pytest.mark.integration
def test_api_market_overview_returns_200():
    """Live HTTP smoke test against the running API."""
    import requests
    r = requests.get("http://localhost:8000/api/market/overview")
    assert r.status_code == 200
```

**Run:**

```bash
pytest tests/integration/ -m integration -v
```
Expected: `4 passed`

**Commit:**

```bash
git add tests/integration/test_db_layer.py
git commit -m "test: add end-to-end integration tests for new DB layer"
```

---

## Bonus: PgBouncer Tuning

**Files:**
- Modify: `docker-compose.yml` or `infra/pgbouncer/pgbouncer.ini` (whichever exists)

Find the PgBouncer service configuration and add/update:

```ini
server_idle_timeout = 30
max_db_connections = 80
```

If configured via environment variables in `docker-compose.yml`:

```yaml
environment:
  - PGBOUNCER_SERVER_IDLE_TIMEOUT=30
  - PGBOUNCER_MAX_DB_CONNECTIONS=80
```

**Commit:**

```bash
git add docker-compose.yml  # or infra/pgbouncer/pgbouncer.ini
git commit -m "perf: tune PgBouncer server_idle_timeout=30 and max_db_connections=80"
```

---

## Final Verification

After all tasks are complete:

```bash
# 1. All new tables exist, old one is gone
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT tablename FROM pg_tables
    WHERE tablename LIKE 'daily_%'
    ORDER BY tablename;
"
# Expected: daily_client_type, daily_fundamentals, daily_prices, daily_prices_2018..2026

# 2. All migrations applied
alembic current
# Expected: 008

# 3. Full test suite
pytest tests/ -v --ignore=tests/integration
pytest tests/integration/ -m integration -v

# 4. API still works
curl http://localhost:8000/api/market/overview | python -m json.tool | head -20
```

---

## Summary Checklist

- [ ] Task 1: New ORM models in models.py
- [ ] Task 2: Migration 005 — shadow tables + partitions
- [ ] Task 3: BaseRepository
- [ ] Task 4: DailyPricesRepository
- [ ] Task 5: DailyFundamentalsRepository + DailyClientTypeRepository
- [ ] Task 6: Migration 007 — indexes
- [ ] Task 7: Migration 006 — backfill (batched)
- [ ] Task 8: Dual-write in pipeline + 48h monitoring
- [ ] Task 9: market.py → DailyPricesRepository
- [ ] Task 10: stocks.py + crypto.py → repositories
- [ ] Task 11: loans.py → LoanRepository, remove camelCase mappers
- [ ] Task 12: Migration 008 — drop DailyOHLCV
- [ ] Task 13: Update cache tags
- [ ] Task 14: Integration test suite
- [ ] Bonus: PgBouncer tuning
