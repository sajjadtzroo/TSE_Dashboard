# Database Architecture Overhaul — Design Document

**Date**: 2026-02-19
**Status**: Approved
**Approach**: Schema Normalization + Repository Pattern (Approach B)

---

## Problem Statement

The `DailyOHLCV` table is a 40+ column god table merging three distinct concerns:
- **Price data** (OHLCV, last price, yesterday price, trade count)
- **Fundamental data** (EPS, PE ratio, market cap, NAV, float shares)
- **Client-type data** (real/legal buyer/seller counts and values)

This causes:
- Every query is heavier than it needs to be (touches all 40+ columns even when only 5 are needed)
- Fundamentals are rewritten daily even though they update less frequently than prices
- Query logic is written inline in route handlers — untestable, inconsistent, and hard to extend
- No standard for filtering, pagination, or response mapping across routes
- Near-zero test coverage on the database layer

---

## Solution: Approach B — Schema Split + Repository Pattern

### Goals
1. Split `DailyOHLCV` into 3 focused tables
2. Add year-range partitioning and critical indexes for performance
3. Introduce a `database/repositories/` layer as the single query interface
4. Achieve >70% unit test coverage on the database layer
5. Execute with zero API downtime

---

## Section 1: Schema Normalization

### New Tables

```
DailyOHLCV (existing, 40+ cols)  →  DailyPrices       (~12 cols, partitioned by year)
                                  →  DailyFundamentals (~14 cols)
                                  →  DailyClientType   (~16 cols)
```

All three share `(security_id, date)` as composite primary key.

#### DailyPrices
Columns: `security_id`, `date`, `open`, `high`, `low`, `close`, `last`, `yesterday_close`,
`volume`, `value`, `trade_count`, `price_change_pct`

Partitioned by year: `daily_prices_2018`, `daily_prices_2019`, ..., `daily_prices_2026`

#### DailyFundamentals
Columns: `security_id`, `date`, `eps`, `pe_ratio`, `market_cap`, `nav`, `float_shares`,
`base_volume`, `estimated_eps`, `institutional_ownership_pct`, `sector_pe`, `industry_pe`,
`price_to_book`, `dividend_yield`

#### DailyClientType
Columns: `security_id`, `date`, `real_buy_count`, `real_sell_count`, `legal_buy_count`,
`legal_sell_count`, `real_buy_value`, `real_sell_value`, `legal_buy_value`, `legal_sell_value`,
`real_buy_volume`, `real_sell_volume`, `legal_buy_volume`, `legal_sell_volume`,
`real_net_buy`, `legal_net_buy`

### Indexes

```sql
-- DailyPrices: most common access pattern
CREATE INDEX idx_daily_prices_symbol_date ON daily_prices (security_id, date DESC);
CREATE INDEX idx_daily_prices_date ON daily_prices (date DESC);

-- DailyFundamentals: PE/EPS screening
CREATE INDEX idx_daily_fundamentals_date_sector ON daily_fundamentals (date DESC, sector_id);

-- DailyClientType: money flow analysis
CREATE INDEX idx_daily_client_type_symbol_date ON daily_client_type (security_id, date DESC);
```

---

## Section 2: Repository Pattern

### Directory Structure

```
database/
├── models.py              (existing — ORM models, updated with new tables)
├── connection.py          (existing — async engine + session factory)
├── repositories/
│   ├── __init__.py        — exports all repos
│   ├── base.py            — BaseRepository(Generic[T])
│   ├── daily_prices.py    — DailyPricesRepository
│   ├── daily_fundamentals.py — DailyFundamentalsRepository
│   ├── daily_client_type.py  — DailyClientTypeRepository
│   ├── securities.py      — SecurityRepository
│   ├── market_index.py    — MarketIndexRepository
│   ├── loans.py           — LoanRepository
│   └── crypto.py          — CryptoRepository
└── query_builders/
    ├── filters.py         — reusable filter factories
    └── pagination.py      — limit/offset + cursor pagination
```

### BaseRepository Interface

```python
class BaseRepository(Generic[T]):
    async def get(self, id: int) -> T | None
    async def list(self, filters: FilterSet, pagination: Pagination) -> Page[T]
    async def create(self, data: BaseModel) -> T
    async def bulk_upsert(self, rows: list[BaseModel]) -> int  # for spider pipelines
```

### Route Before/After

**Before** (inline SQLAlchemy in route):
```python
@router.get("/daily/{symbol}")
async def get_daily(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DailyOHLCV).join(Security, ...).where(Security.ticker == symbol)
        .order_by(DailyOHLCV.date.desc()).limit(30)
    )
    rows = result.scalars().all()
    return [_map_to_camel(r) for r in rows]  # hand-rolled mapping
```

**After** (repository):
```python
@router.get("/daily/{symbol}")
async def get_daily(symbol: str, repo: DailyPricesRepository = Depends()):
    return await repo.get_recent(symbol=symbol, days=30)
```

### Service Layer Role
`services_loans.py` and similar files become orchestration-only. They call repositories, never SQLAlchemy directly. The 5 camelCase mapping functions in `loans.py` are removed — mapping is handled by repository response schemas.

---

## Section 3: Migration Strategy (Zero-Downtime)

### Four Phases

**Phase 1 — Shadow Tables** (no downtime)
- Create `DailyPrices`, `DailyFundamentals`, `DailyClientType` tables
- Backfill historical data in batches (1,000 rows/batch, 100ms sleep)
- Old `DailyOHLCV` remains live and untouched

**Phase 2 — Dual Write** (no downtime)
- Spider pipelines write to both old and new tables
- Run for 48 hours to verify new tables receive correct data
- Compare row counts and checksums

**Phase 3 — Switch Reads** (no downtime)
- Update all routes to use repositories (new tables)
- Run API response smoke tests: before vs after parity
- `DailyOHLCV` still written as safety net

**Phase 4 — Cutover** (5-minute maintenance window)
- Run final backfill sync
- Drop `DailyOHLCV`
- Remove dual-write from pipelines
- Update cache tags

### Alembic Migration Files

```
alembic/versions/
  005_create_daily_prices_shadow.py      — create new tables + partitions
  006_backfill_daily_prices.py           — batched data migration
  007_add_daily_prices_indexes.py        — add all indexes
  008_drop_daily_ohlcv.py                — final cutover (irreversible)
```

---

## Section 4: Performance Improvements

### Partitioning Expected Impact
- Historical range queries (e.g., 1 year of data): **~800ms → ~80ms** (partition pruning)
- Dashboard "latest date" queries: unchanged (recent partition only)
- Full table scans: eliminated by partition pruning + index coverage

### PgBouncer Tuning
```ini
server_idle_timeout = 30       # return idle connections faster
max_db_connections = 80        # cap at 80% of max_connections=200
```

### Repository Cache Integration
Repositories use the existing `RedisCacheManager`:
- `DailyPricesRepository.get_recent()` → tag `daily_prices:{security_id}`, TTL 900s (trading) / 86400s (off)
- `DailyFundamentalsRepository.get_latest()` → tag `fundamentals:{security_id}`, TTL 3600s
- Cache invalidation triggered by spider pipeline on insert (consistent with existing convention)

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Historical query time | ~800ms | ~80ms |
| Adding a new query | Inline SQLAlchemy in route | `repo.get_recent(symbol)` |
| DB layer test coverage | ~0% | >70% |
| `DailyOHLCV` columns | 40+ | Table removed |
| Largest route LOC | 516 (`loans.py`) | ~180 per sub-file |
| Risk of query regression | High | Low |

---

## Roadmap

### Week 1 — Foundation
- [ ] SQLAlchemy models for 3 new tables
- [ ] Alembic migrations 005 and 007
- [ ] `database/repositories/base.py` with generics
- [ ] `DailyPricesRepository`, `DailyFundamentalsRepository`, `DailyClientTypeRepository`
- [ ] PgBouncer config tuning

### Week 1–2 — Data Migration
- [ ] Batched backfill script (migration 006)
- [ ] Row-count + checksum validation tests
- [ ] Enable dual-write in spider pipelines
- [ ] 48h monitoring period

### Week 2–3 — Route Migration
- [ ] `market.py` → `DailyPricesRepository`
- [ ] `stocks.py` → `SecurityRepository` + `DailyPricesRepository`
- [ ] `loans.py` → `LoanRepository` (remove `services_loans.py` query logic)
- [ ] `crypto.py` → `CryptoRepository`
- [ ] Remove all hand-rolled camelCase mappers
- [ ] API response smoke tests (before/after parity)

### Week 3 — Cutover & Cleanup
- [ ] Final backfill sync + drop `DailyOHLCV` (migration 008)
- [ ] Remove dual-write from spider pipelines
- [ ] Update cache tags to new names
- [ ] Integration test suite: spider → DB → API end-to-end

---

## What Is NOT Changing
- API contract: all response shapes remain identical
- Cache tag convention (extended, not replaced)
- Auth and rate-limit middleware
- Spider scraping logic (only pipeline `upsert` calls change)
- Frontend (no changes needed — API responses are identical)
