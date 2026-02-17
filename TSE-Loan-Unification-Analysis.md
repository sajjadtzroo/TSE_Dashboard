# TSE Dashboard + Persian Loan Unification: Comprehensive Architecture Analysis

**Date:** February 17, 2026  
**Author:** Davood Gilemard — Senior Data Engineer  
**Status:** Architecture Decision Review  
**Overall Score:** 7/10 (Original Plan) → 8.5/10 (With Recommended Changes)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Architecture Options Comparison](#3-architecture-options-comparison)
4. [Original Merge Plan — Strengths](#4-original-merge-plan--strengths)
5. [Original Merge Plan — Critical Issues](#5-original-merge-plan--critical-issues)
6. [Recommended Architecture: Modular Monolith](#6-recommended-architecture-modular-monolith)
7. [Phase-by-Phase Revised Plan](#7-phase-by-phase-revised-plan)
8. [Risk Analysis](#8-risk-analysis)
9. [Revised Timeline](#9-revised-timeline)
10. [Final Recommendations](#10-final-recommendations)

---

## 1. Executive Summary

This document provides an in-depth analysis of the proposed plan to merge the **TSE Dashboard** (Tehran Stock Exchange monitoring platform) and **Persian Loan** (bank loan comparison tool) into a single unified application. We evaluate the original merge plan, its subsequent review document, and propose a **third architectural option** — the **Modular Monolith** — which we believe is the optimal path for this project's scale and team dynamics.

### Key Findings

| Area | Original Plan | Review Document | Our Recommendation |
|------|:---:|:---:|:---:|
| Architecture | Tight merge into monolith | Same, with fixes | **Modular Monolith** with clear boundaries |
| Database | PostgreSQL + JSONB | Fully normalized PostgreSQL | **Hybrid**: normalized core + JSONB for truly flexible data |
| Frontend | TSX → JSX conversion | JSX → TSX migration | **Keep both**, gradually converge to TypeScript |
| Auth | Reuse TSE's JWT | Audit + merge users | **Shared auth module** with adapter pattern |
| Deployment | Big-bang merge | Feature flags | Feature flags + **canary deploy** |
| Timeline | 18–22 hrs | 43–51 hrs | **62–81 hrs (8–10 business days)** |

### Why Not a Gateway with Two Databases?

The user raised an excellent question: *"What about building a FastAPI gateway and keeping two separate databases?"* We evaluate this option thoroughly in Section 3. Short answer: for a project of this scale (~15 banks, ~80 loan products, small team), a full microservices/gateway architecture introduces more operational overhead than it solves. However, the *principle* behind it — loose coupling and clear service boundaries — is exactly right. The Modular Monolith captures those benefits without the infrastructure cost.

---

## 2. Current State Assessment

### 2.1 System Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Current Architecture                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐  │
│  │   TSE SPA    │     │  Loan SPA    │     │       Nginx          │  │
│  │  (React JSX) │     │ (React TSX)  │     │  / → TSE SPA         │  │
│  │  Vite Build  │     │  Vite Build  │     │  /loans/ → Loan SPA  │  │
│  └──────┬───────┘     └──────┬───────┘     └──────────────────────┘  │
│         │                    │                                        │
│  ┌──────▼───────┐     ┌──────▼───────┐                               │
│  │  TSE FastAPI  │     │ Loan FastAPI │                               │
│  │  /api/*       │     │ /api/*       │                               │
│  └──────┬───────┘     └──────┬───────┘                               │
│         │                    │                                        │
│  ┌──────▼───────┐     ┌──────▼───────┐     ┌──────────────────────┐  │
│  │  PostgreSQL   │     │   MongoDB    │     │       Redis          │  │
│  │  (TSE data)   │     │ (Loan data)  │     │     (Cache/SSE)      │  │
│  └──────────────┘     └──────────────┘     └──────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Pain Points

| Pain Point | Severity | Description |
|-----------|:---:|-------------|
| Dual build pipeline | Medium | Two separate Docker stages, two Vite builds, two npm installs |
| Fragmented UX | High | Users navigate between two completely separate SPAs |
| Duplicated auth | High | Two auth systems, potentially different user tables |
| MongoDB operational cost | Medium | Extra container/service for ~80 records of static reference data |
| Two codebases in one repo | Medium | Maintenance burden, unclear ownership |
| No shared state | High | User preferences, watchlists don't cross boundaries |

### 2.3 Data Scale Reality Check

This is crucial context often overlooked:

| Metric | Value | Implication |
|--------|-------|-------------|
| Total banks | ~15 | Fits in a single database table |
| Total loan products | ~80 | Essentially static reference data |
| Update frequency | Weekly/monthly at most | No need for real-time sync |
| Data relationships | Shallow (bank → loans → coefficients) | Simple relational model |
| Query complexity | Filter + sort + paginate | Standard CRUD, no complex aggregation |

**Verdict:** MongoDB is overkill for this dataset. PostgreSQL handles it trivially.

---

## 3. Architecture Options Comparison

We evaluated three architectural approaches:

### Option A: Full Merge into Monolith (Original Plan)

```
┌──────────────────────────┐
│     Unified FastAPI       │
│  ┌─────────┬──────────┐  │
│  │ TSE API  │ Loan API │  │
│  └────┬────┴─────┬────┘  │
│       └────┬─────┘       │
│     ┌──────▼──────┐      │
│     │  PostgreSQL  │      │
│     └─────────────┘      │
└──────────────────────────┘
```

| Pros | Cons |
|------|------|
| Single deployment unit | High merge risk — one mistake breaks everything |
| Single database | Tight coupling between TSE and loan code |
| Shared auth naturally | Large blast radius for changes |
| Simplest infrastructure | Hard to revert if merge goes wrong |

### Option B: API Gateway with Two Databases (User's Suggestion)

```
┌──────────────────────────────────────────────┐
│              FastAPI Gateway                   │
│         (Auth, Routing, Rate Limiting)         │
│  ┌────────────────┬──────────────────────┐    │
│  │  /api/market/*  │   /api/loans/*       │    │
│  └───────┬────────┴──────────┬───────────┘    │
│          │                   │                 │
│  ┌───────▼────────┐  ┌──────▼───────────┐    │
│  │  TSE Service    │  │  Loan Service    │    │
│  │  (FastAPI)      │  │  (FastAPI)       │    │
│  └───────┬────────┘  └──────┬───────────┘    │
│  ┌───────▼────────┐  ┌──────▼───────────┐    │
│  │  PostgreSQL     │  │  MongoDB/PG      │    │
│  └────────────────┘  └──────────────────┘    │
└──────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Clean separation of concerns | 3 FastAPI apps to maintain instead of 1 |
| Independent deployment | Distributed auth complexity (JWT validation in gateway + services) |
| Can keep MongoDB if desired | Network latency between gateway and services |
| Zero risk to TSE during loan changes | Operational overhead: 3 containers, health checks, service discovery |
| Future-proof for more services | Overkill for ~80 records of static data |
| | Cross-service transactions are hard |
| | Two databases to back up, monitor, secure |

**When Option B makes sense:** If you had 5+ development teams, hundreds of thousands of records, different scaling requirements per service, or planned to add many more independent features (e.g., insurance comparison, credit scoring). For a small team with a simple dataset, the gateway adds complexity without proportional benefit.

### Option C: Modular Monolith (Recommended) ✅

```
┌──────────────────────────────────────────────┐
│           Unified FastAPI Application          │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │          Shared Core Module              │  │
│  │  (Auth, Cache, Config, Health, Models)   │  │
│  └──────────────┬──────────────────────────┘  │
│                 │                              │
│  ┌──────────────▼──────────────────────────┐  │
│  │           Module Router                  │  │
│  │  app.include_router(tse_router)          │  │
│  │  app.include_router(loan_router)         │  │
│  └─────┬─────────────────────┬─────────────┘  │
│        │                     │                 │
│  ┌─────▼──────────┐  ┌──────▼──────────┐     │
│  │  TSE Module     │  │  Loan Module    │     │
│  │  ├── router.py  │  │  ├── router.py  │     │
│  │  ├── models.py  │  │  ├── models.py  │     │
│  │  ├── schemas.py │  │  ├── schemas.py │     │
│  │  ├── service.py │  │  ├── service.py │     │
│  │  └── deps.py    │  │  └── deps.py    │     │
│  └─────┬──────────┘  └──────┬──────────┘     │
│        └──────────┬──────────┘                │
│           ┌───────▼───────┐                   │
│           │  PostgreSQL    │                   │
│           │  (All tables)  │                   │
│           └───────────────┘                   │
└──────────────────────────────────────────────┘
```

| Pros | Cons |
|------|------|
| Single deployment, simple ops | Requires discipline to maintain module boundaries |
| Clear module boundaries (like microservices) | Shared database means careful migration planning |
| Shared auth, cache, config naturally | Still a single process (if it crashes, everything goes) |
| Each module can be extracted to microservice later | |
| Single database — simpler backups, transactions | |
| Minimal infrastructure overhead | |
| Follows Netflix Dispatch / FastAPI best practices | |

### Decision Matrix

| Criterion | Weight | Option A (Monolith) | Option B (Gateway) | Option C (Modular) |
|-----------|:---:|:---:|:---:|:---:|
| Implementation complexity | 20% | 7 | 4 | 8 |
| Operational simplicity | 20% | 8 | 4 | 8 |
| Risk to existing TSE | 20% | 5 | 9 | 7 |
| Maintainability | 15% | 5 | 7 | 8 |
| Future scalability | 10% | 4 | 9 | 7 |
| Team skill match | 15% | 7 | 5 | 8 |
| **Weighted Score** | **100%** | **6.1** | **6.1** | **7.7** |

**Winner: Option C — Modular Monolith**

---

## 4. Original Merge Plan — Strengths

### 4.1 Database Migration Decision — Correct

Eliminating MongoDB for ~80 records of static data is the right call. PostgreSQL handles this trivially and removes an entire infrastructure dependency.

### 4.2 Branch Cleanup Strategy — Well-Organized

The branch analysis table is thorough. Identifying 10+ stale branches for deletion reduces confusion and ensures a clean starting point.

### 4.3 API Design — Comprehensive

The endpoint design covers all necessary operations: public browsing, authenticated user tracking, and admin import. The `/api/loans/` prefix provides clear namespacing.

### 4.4 Shared Infrastructure Reuse — Smart

Reusing TSE's existing JWT auth, Redis cache decorators, and Alembic migration pipeline avoids reinventing the wheel.

### 4.5 Infrastructure Simplification — Valuable

Removing the separate Docker build stage, MongoDB container, and Nginx alias routing genuinely reduces operational burden.

---

## 5. Original Merge Plan — Critical Issues

### 5.1 🔴 JSONB Anti-Pattern: Partially Wrong, Partially Right

The original plan uses JSONB for `scoring_system`, `coefficient_table`, `requirements`, and `extra_data`. The review document argues for full normalization. **Both are partially wrong.**

**The nuance:** Not all JSONB usage is bad. The right approach is a hybrid:

| Field | Original Plan | Review Suggestion | Correct Approach |
|-------|:---:|:---:|:---:|
| `interest_rate`, `max_amount`, `guarantor` | Structured columns ✅ | Structured columns ✅ | Structured columns ✅ |
| `coefficient_table` | JSONB ❌ | Separate table ✅ | **Separate table** — queried by duration, needs indexing |
| `requirements` | JSONB ❌ | Separate table ✅ | **Separate table** — filtered by type, needs indexing |
| `scoring_system` | JSONB ❓ | Separate table ❓ | **JSONB is fine** — varies wildly per bank, rarely queried directly |
| `extra_data` | JSONB ✅ | Not mentioned | **JSONB is correct** — catch-all for unstructured overflow |

**Rule of thumb:** If you filter, sort, or join on a field → normalize it. If you just read/display it → JSONB is fine.

### 5.2 🔴 Alembic Migration Strategy — Completely Missing

The original plan mentions "Create Alembic migration" as a single 30-minute task. For 5+ new tables with foreign keys, indexes, constraints, and data seeding, this needs a proper strategy:

**Required migration chain:**

```
001_create_loan_banks.py           → Independent table, no FKs
002_create_loan_products.py        → FK → loan_banks
003_create_loan_coefficients.py    → FK → loan_products
004_create_loan_requirements.py    → FK → loan_products
005_create_user_loans.py           → FK → users, FK → loan_products
006_create_payment_schedules.py    → FK → user_loans
007_create_payment_alerts.py       → FK → users, FK → user_loans
008_add_indexes.py                 → All composite indexes
009_seed_initial_data.py           → Bank + loan product data
```

**Critical requirements:**
- Every migration MUST have a working `downgrade()` function
- Test migrations on a dump of production data before deploying
- Use `--sql` flag to generate SQL previews before running
- Plan for zero-downtime: add columns as nullable first, backfill, then add constraints

### 5.3 🔴 Auth System Assumption — Unverified

The plan states: *"Reuse TSE's existing JWT auth — No porting needed."*

This assumes Persian Loan has no user management of its own. Before writing any code, you MUST audit:

```bash
# Check Persian Loan for auth-related code
grep -r "jwt\|token\|auth\|login\|password\|user" persian_loan/ --include="*.py" -l
grep -r "jwt\|token\|auth\|login\|password\|user" persian_loan/ --include="*.ts" -l

# Check MongoDB collections
# (run inside MongoDB shell or via mongosh)
db.getCollectionNames()
db.users.countDocuments()
db.users.findOne()
```

**Possible scenarios:**

| Scenario | Action |
|----------|--------|
| No users in MongoDB | Just use TSE auth — plan is correct |
| Users exist with same email + compatible hash | Migrate users, merge profiles |
| Users exist with different identifier (mobile) | Extend User model, add mobile field |
| Users exist with incompatible password hash | Force password reset for migrated users |

### 5.4 🔴 TSX → JSX Conversion — Wrong Direction

The plan calls this "mechanical: remove type annotations." In practice:

1. TypeScript catches bugs at compile time that JSX silently passes through
2. Removing types from 12 pages + hooks + services + utilities is error-prone
3. You lose IDE autocomplete, refactoring support, and documentation
4. It's 2026 — TypeScript is the industry standard

**Better approach:** Keep loan pages as `.tsx` and configure the existing Vite setup to handle both:

```javascript
// vite.config.js — already supports both JSX and TSX by default
export default defineConfig({
  plugins: [react()],
  // Vite + @vitejs/plugin-react handles .jsx and .tsx natively
  // No additional configuration needed
});
```

Then gradually migrate TSE pages to TypeScript as you touch them (the "Boy Scout Rule" — leave code cleaner than you found it).

### 5.5 🟡 Missing Integration & Regression Tests

The plan lists "manual/pytest" for 1 hour of testing. For a merge of this magnitude, you need:

**Minimum test requirements:**

| Test Type | Scope | Estimated Count |
|-----------|-------|:---:|
| Unit tests — Loan service layer | Business logic, calculations | 15–20 |
| Unit tests — Financial calculators | IRR, NPV, MIRR, amortization | 10–15 |
| Integration tests — Loan API endpoints | All 18+ endpoints | 20–25 |
| Regression tests — TSE API endpoints | Existing market, stocks, auth | 10–15 |
| E2E tests — Critical user flows | Loan browsing, comparison, tracking | 5–8 |
| Persian text tests — Encoding | Farsi names, descriptions in DB | 3–5 |

### 5.6 🟡 No Rollback Strategy

The plan has no explicit rollback procedure. If the merge breaks production:

**Rollback checklist (must be prepared BEFORE deployment):**

1. Tag current production commit: `git tag pre-loan-merge`
2. Database: Keep Alembic downgrade path tested and ready
3. Docker: Keep previous image tagged and available
4. Nginx: Keep old config with `/loans/` alias available
5. Feature flags: Kill switch for all loan features
6. Data: Full PostgreSQL backup before migration runs

### 5.7 🟡 Iranian Market Considerations — Absent

| Concern | Detail |
|---------|--------|
| **Deploy platform** | Liara, ArvanCloud, or self-hosted? Affects CDN and package access |
| **Package registries** | npm and PyPI may need proxy/mirror due to sanctions |
| **Jalali calendar** | `created_at` / `updated_at` should store UTC but display as Shamsi |
| **Currency** | `max_amount` is BigInteger (good), but: Rial or Toman? Store Rial, display both? |
| **SMS auth** | Iranian users expect mobile-based auth — does User model support phone number? |
| **CDN/DNS** | Cloudflare works in Iran but with limitations; ArvanCloud CDN may be more reliable |

### 5.8 🟡 Cache Strategy Gaps

The plan adds cache tags `"loans"`, `"loan_banks"`, `"loan_analytics"` but doesn't address:

- **Cache backend**: Is Redis already running? What's the eviction policy?
- **TTL strategy**: Bank data (changes monthly) vs. analytics (changes on every data update) need different TTLs
- **Cache warming**: After invalidation, first request will be slow — pre-warm critical endpoints
- **Race conditions**: Between invalidate and next read, stale data can be re-cached under concurrent load

### 5.9 🟡 Bundle Size Impact Unmeasured

Adding 12 pages + calculator engines + financial utilities + 5 new npm packages will increase the frontend bundle. Without lazy loading:

```
Estimated additions:
  - 12 page components:     ~120 KB (minified)
  - Financial calculators:  ~80 KB
  - date-fns-jalali:        ~40 KB
  - zod:                    ~50 KB
  - formulajs:              ~100 KB
  ────────────────────────────────
  Total:                    ~390 KB additional
```

**Must implement:**
- `React.lazy()` + `Suspense` for all loan pages
- Dynamic `import()` for calculator engines
- Bundle analysis before/after: `npx vite-bundle-visualizer`

---

## 6. Recommended Architecture: Modular Monolith

### 6.1 Backend Structure

Inspired by Netflix's Dispatch pattern and FastAPI best practices:

```
backend/
├── alembic/
│   └── versions/
├── core/                          # Shared kernel
│   ├── config.py                  # Settings, env vars, feature flags
│   ├── database.py                # Engine, session factory
│   ├── deps.py                    # Common dependencies (get_db, get_cache)
│   ├── auth/
│   │   ├── router.py              # /api/auth/*
│   │   ├── models.py              # User, Role
│   │   ├── schemas.py             # UserCreate, Token, etc.
│   │   ├── service.py             # JWT creation, password hashing
│   │   └── deps.py                # get_current_user, require_role
│   ├── cache/
│   │   ├── manager.py             # RedisCacheManager
│   │   └── decorators.py          # @cached()
│   └── health/
│       └── router.py              # /health, /readiness
│
├── modules/
│   ├── tse/                       # TSE Market Module
│   │   ├── __init__.py
│   │   ├── router.py              # /api/market/*, /api/stocks/*
│   │   ├── models.py              # Stock, MarketData, Watchlist
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── deps.py
│   │   └── scrapers/              # Scrapy spiders
│   │
│   └── loans/                     # Loan Module  ← NEW
│       ├── __init__.py
│       ├── router.py              # /api/loans/*
│       ├── models.py              # LoanBank, LoanProduct, etc.
│       ├── schemas.py             # Pydantic models
│       ├── service.py             # Business logic
│       ├── deps.py                # Loan-specific dependencies
│       ├── calculator/            # Financial calculation engine
│       │   ├── irr.py
│       │   ├── npv.py
│       │   └── amortization.py
│       └── seed.py                # Data seeding script
│
├── main.py                        # App factory + router registration
└── requirements.txt
```

**Key principles:**
- Each module has its own `models.py`, `schemas.py`, `service.py`, `router.py`
- Modules communicate through the shared `core` — never import directly from each other
- If `loans` module needs user data, it uses `core.auth.deps.get_current_user` dependency
- Database models are all registered in one Alembic migration env, but organized per module

### 6.2 Module Registration Pattern

```python
# main.py
from fastapi import FastAPI
from core.config import settings
from core.auth.router import auth_router
from core.health.router import health_router
from modules.tse.router import tse_router

def create_app() -> FastAPI:
    app = FastAPI(title="TSE Dashboard", version="2.0.0")

    # Core routers (always enabled)
    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(health_router, tags=["health"])

    # TSE module (always enabled)
    app.include_router(tse_router, prefix="/api", tags=["tse"])

    # Loan module (feature-flagged)
    if settings.ENABLE_LOANS:
        from modules.loans.router import loan_router
        app.include_router(loan_router, prefix="/api/loans", tags=["loans"])

    return app

app = create_app()
```

### 6.3 Database Model — Hybrid Approach

```python
# modules/loans/models.py
from sqlalchemy import (
    Column, Integer, String, BigInteger, Numeric, Boolean,
    Text, DateTime, Enum, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class LoanBank(Base):
    __tablename__ = "loan_banks"

    id = Column(Integer, primary_key=True)
    bank_pk = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)          # Persian name
    name_en = Column(String(200))                        # English name (optional)
    category = Column(
        Enum('traditional', 'digital', name='bank_category'),
        nullable=False, index=True
    )
    bank_type = Column(String(100))
    website = Column(String(500))
    logo_url = Column(String(500))

    # JSONB — OK here: scoring varies wildly per bank, rarely queried directly
    scoring_system = Column(JSONB, default={})

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    loans = relationship("LoanProduct", back_populates="bank", cascade="all, delete-orphan")


class LoanProduct(Base):
    __tablename__ = "loan_products"

    id = Column(Integer, primary_key=True)
    loan_id = Column(String(100), nullable=False)
    bank_id = Column(Integer, ForeignKey("loan_banks.id"), nullable=False, index=True)

    # Structured — these are queried, filtered, sorted
    loan_type = Column(String(200), nullable=False, index=True)
    interest_rate_display = Column(String(50))            # Display: "18% - 23%"
    interest_rate_min = Column(Numeric(5, 2))             # Queryable: 18.00
    interest_rate_max = Column(Numeric(5, 2))             # Queryable: 23.00
    max_amount = Column(BigInteger)                       # In Rials
    min_amount = Column(BigInteger)
    max_months = Column(Integer, index=True)
    min_months = Column(Integer)
    guarantor_required = Column(Boolean, default=False, index=True)
    guarantor_type = Column(String(100))
    calculation_method = Column(
        Enum('flat_rate', 'reducing_balance', 'compound', name='calc_method'),
        nullable=False, index=True
    )
    prepayment_penalty = Column(Boolean, default=False)

    # JSONB — OK here: catch-all for bank-specific extra fields
    extra_data = Column(JSONB, default={})

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bank = relationship("LoanBank", back_populates="loans")
    coefficients = relationship("LoanCoefficient", back_populates="loan", cascade="all, delete-orphan")
    requirements = relationship("LoanRequirement", back_populates="loan", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('loan_id', 'bank_id', name='uq_loan_bank'),
        Index('idx_loan_amount_range', 'min_amount', 'max_amount'),
        Index('idx_loan_duration', 'min_months', 'max_months'),
        Index('idx_loan_rate_range', 'interest_rate_min', 'interest_rate_max'),
    )


class LoanCoefficient(Base):
    """Normalized — queried by duration, needs proper indexing"""
    __tablename__ = "loan_coefficients"

    id = Column(Integer, primary_key=True)
    loan_id = Column(Integer, ForeignKey("loan_products.id", ondelete="CASCADE"), nullable=False)
    duration_months = Column(Integer, nullable=False)
    coefficient = Column(Numeric(10, 6), nullable=False)

    loan = relationship("LoanProduct", back_populates="coefficients")

    __table_args__ = (
        UniqueConstraint('loan_id', 'duration_months', name='uq_loan_coeff_duration'),
        Index('idx_coeff_lookup', 'loan_id', 'duration_months'),
    )


class LoanRequirement(Base):
    """Normalized — filtered by type, needs indexing"""
    __tablename__ = "loan_requirements"

    id = Column(Integer, primary_key=True)
    loan_id = Column(Integer, ForeignKey("loan_products.id", ondelete="CASCADE"), nullable=False)
    requirement_type = Column(
        Enum('document', 'collateral', 'credit_score', 'employment', 'income', name='req_type'),
        nullable=False, index=True
    )
    description = Column(Text, nullable=False)           # Persian text
    is_mandatory = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)

    loan = relationship("LoanProduct", back_populates="requirements")

    __table_args__ = (
        Index('idx_req_loan_type', 'loan_id', 'requirement_type'),
    )
```

### 6.4 Frontend Strategy — Keep TypeScript

Instead of converting TSX → JSX, configure the build to handle both:

```
frontend/src/
├── pages/
│   ├── Dashboard.jsx              # Existing TSE (JSX)
│   ├── MarketOverview.jsx         # Existing TSE (JSX)
│   ├── loans/                     # NEW — keep as TypeScript
│   │   ├── LoanLayout.tsx
│   │   ├── LoanDashboard.tsx
│   │   ├── LoanBanks.tsx
│   │   └── ...
├── features/
│   └── loans/                     # Keep TypeScript
│       ├── calculator/
│       └── compare/
├── hooks/
│   ├── useMarketData.js           # Existing (JSX)
│   └── loans/                     # Keep TypeScript
│       ├── useBanks.ts
│       └── useLoans.ts
└── services/
    ├── marketService.js           # Existing (JSX)
    └── loans/                     # Keep TypeScript
        ├── banksService.ts
        └── loansService.ts
```

Vite handles `.jsx` and `.tsx` files in the same project natively. No extra configuration needed.

---

## 7. Phase-by-Phase Revised Plan

### Phase 0: Audit & Preparation (NEW — 4–6 hours)

This phase is **completely absent** from the original plan and is critical.

| Task | Duration | Output |
|------|:---:|--------|
| Audit MongoDB for user data | 30 min | User migration strategy or confirmation of no users |
| Audit Persian Loan auth system | 30 min | Auth merge plan |
| Audit MongoDB schema (all collections, field coverage) | 1 hr | Data mapping document |
| Audit password hashing algorithms in both systems | 30 min | Compatibility assessment |
| Measure current frontend bundle size | 15 min | Baseline metrics |
| Document all existing TSE API endpoints (contract) | 1 hr | Regression test baseline |
| Full backup of PostgreSQL + MongoDB | 30 min | Safety net |
| Set up staging environment | 1–2 hrs | Safe testing ground |

### Phase 1: Branch Cleanup (1 hour)

Follows the original plan with one addition:

```bash
# Tag current state BEFORE any cleanup
git tag v1.0-pre-unification -m "State before loan unification"

# Verify no one has unpushed work
git fetch --all
git log origin/develop --oneline -5

# Announce to team: 24hr warning before branch operations
# ... then proceed with original cleanup steps
```

### Phase 2: Backend — Database & API (20–25 hours)

| Step | Task | Duration |
|------|------|:---:|
| 2.1 | Create modular directory structure | 30 min |
| 2.2 | Implement loan models (hybrid JSONB + normalized) | 2 hrs |
| 2.3 | Create Alembic migration chain (9 migrations) | 2 hrs |
| 2.4 | Test migrations: `upgrade` and `downgrade` on staging | 1 hr |
| 2.5 | Write idempotent seed script with dry-run mode | 2 hrs |
| 2.6 | Implement loan service layer (business logic) | 3 hrs |
| 2.7 | Implement loan API router (18+ endpoints) | 4 hrs |
| 2.8 | Implement cache strategy with proper TTLs | 1 hr |
| 2.9 | Write backend unit tests (service + calculator) | 3 hrs |
| 2.10 | Write backend integration tests (API endpoints) | 2 hrs |

### Phase 3: Frontend — Integration (16–20 hours)

| Step | Task | Duration |
|------|------|:---:|
| 3.1 | Copy loan pages to `frontend/src/pages/loans/` (keep .tsx) | 1 hr |
| 3.2 | Copy hooks, services, features (keep .ts/.tsx) | 1 hr |
| 3.3 | Update all API base URLs to `/api/loans/*` | 1 hr |
| 3.4 | Deduplicate Rally components (fix imports) | 2 hrs |
| 3.5 | Create `LoanLayout.tsx` + `LoanSelectionContext.tsx` | 1 hr |
| 3.6 | Add lazy-loaded loan routes to `App.jsx` | 1 hr |
| 3.7 | Update sidebar navigation with loan section | 30 min |
| 3.8 | Update landing page route | 15 min |
| 3.9 | Add npm dependencies + verify no conflicts | 30 min |
| 3.10 | Bundle size analysis + optimization | 2 hrs |
| 3.11 | Manual testing of all 12 loan pages | 2 hrs |
| 3.12 | Persian text rendering verification | 1 hr |
| 3.13 | Fix edge cases and polish | 3 hrs |

### Phase 4: Infrastructure (4–6 hours)

| Step | Task | Duration |
|------|------|:---:|
| 4.1 | Update Dockerfile (remove loans-build stage) | 30 min |
| 4.2 | Update nginx.conf (remove `/loans/` alias) | 30 min |
| 4.3 | Add feature flags to config | 30 min |
| 4.4 | Update health check to include loan tables | 30 min |
| 4.5 | Set up monitoring/alerting for loan endpoints | 1 hr |
| 4.6 | Staging deployment + smoke test | 2 hrs |

### Phase 5: Testing & Verification (8–12 hours)

| Step | Task | Duration |
|------|------|:---:|
| 5.1 | Run full integration test suite | 1 hr |
| 5.2 | TSE regression testing (all existing endpoints) | 2 hrs |
| 5.3 | WebSocket/SSE real-time verification | 1 hr |
| 5.4 | Auth flow testing (register, login, refresh, roles) | 1 hr |
| 5.5 | Load testing (100 concurrent requests) | 1 hr |
| 5.6 | Persian text encoding verification in DB | 30 min |
| 5.7 | Financial calculator accuracy verification | 1 hr |
| 5.8 | Bundle size comparison vs. baseline | 30 min |
| 5.9 | Docker full build + deploy test | 1 hr |
| 5.10 | Prepare rollback procedure and test it | 1 hr |

### Phase 6: Deployment & Cleanup (2–4 hours)

| Step | Task | Duration |
|------|------|:---:|
| 6.1 | Production backup (PostgreSQL + Redis) | 30 min |
| 6.2 | Deploy with `ENABLE_LOANS=false` | 30 min |
| 6.3 | Run Alembic migrations on production | 30 min |
| 6.4 | Run seed script on production | 15 min |
| 6.5 | Enable loans for admin users only | 15 min |
| 6.6 | Monitor for 24 hours | — |
| 6.7 | Gradual rollout: 10% → 50% → 100% | 3 days |
| 6.8 | Archive `persian_loan/` directory | 30 min |
| 6.9 | Remove feature flags after 2 weeks | 15 min |

---

## 8. Risk Analysis

### Risk Matrix

| # | Risk | Probability | Impact | Mitigation |
|---|------|:---:|:---:|------------|
| R1 | User data loss during migration | Medium | Critical | Dry-run script + full backup + rollback procedure |
| R2 | TSE endpoints break after merge | High | Critical | Regression test suite + canary deploy + instant rollback |
| R3 | Persian text encoding corruption | Low | High | UTF-8 verification tests + `client_encoding=utf8` |
| R4 | Frontend bundle size regression | High | Medium | Lazy loading + bundle analysis + size budget |
| R5 | Financial calculator accuracy drift | Low | High | Unit tests against known-good values from original app |
| R6 | Database migration failure on production | Medium | Critical | Test on staging dump + `downgrade()` tested + backup |
| R7 | Cache stale data after updates | High | Medium | Event-driven invalidation + short TTL for analytics |
| R8 | Password hash incompatibility | Medium | High | Audit both systems + force-reset strategy ready |
| R9 | npm package conflicts (version mismatch) | Medium | Medium | Lock file review + `npm ls` for duplicates |
| R10 | Deployment platform limitations (Iran) | Low | High | Test with proxy/mirror for package registries |

### Critical Path

```
Audit (Phase 0) ──────────────────────────────────────────────────────────┐
   │                                                                       │
   ├── DB Schema Design ── Alembic Migrations ── Seed Script               │
   │        │                                                              │
   │        ├── API Service Layer ── API Router ── Backend Tests            │
   │        │                                                              │
   │        └── Frontend Copy ── Import Fix ── Routing ── Frontend Tests   │
   │                                                                       │
   ├── Infrastructure ── Feature Flags ── Staging Deploy                   │
   │                                                                       │
   └── Full Test Suite ── Production Deploy ── Monitoring ── Cleanup ──────┘
```

---

## 9. Revised Timeline

| Phase | Original Plan | Review Document | Our Estimate |
|-------|:---:|:---:|:---:|
| Phase 0: Audit & Prep | — | — | **4–6 hours** |
| Phase 1: Branch cleanup | 20 min | 1 hour | **1.5 hours** |
| Phase 2: Backend migration | 7–8 hrs | 16–20 hrs | **20–25 hours** |
| Phase 3: Frontend migration | 7–9 hrs | 20–24 hrs | **16–20 hours** |
| Phase 4: Infrastructure | 25 min | 2 hours | **4–6 hours** |
| Phase 5: Testing & verification | 2 hrs | 4 hours | **8–12 hours** |
| Phase 6: Deploy & cleanup | Included above | Included above | **2–4 hours** |
| Buffer (15%) | — | — | **8–12 hours** |
| **Total** | **18–22 hours** | **43–51 hours** | **64–86 hours** |
| **Business Days** | **2–3 days** | **5–6 days** | **8–11 days** |

---

## 10. Final Recommendations

### ✅ DO

1. **Adopt the Modular Monolith pattern** — clear module boundaries within a single deployment unit
2. **Use the hybrid JSONB approach** — normalize queryable fields, keep JSONB for truly flexible data
3. **Keep TypeScript** for loan pages — Vite handles JSX + TSX natively
4. **Add an Audit phase (Phase 0)** before writing any code
5. **Write Alembic migrations as a proper chain** with tested downgrade paths
6. **Implement feature flags** for gradual rollout
7. **Measure bundle size** before and after with a hard budget (main chunk < +200KB)
8. **Write integration tests** covering all 18+ loan endpoints + TSE regression
9. **Test Persian text encoding** end-to-end (DB → API → frontend rendering)
10. **Prepare rollback procedure** and test it before deploying

### ❌ DON'T

1. ~~Convert TSX → JSX~~ — keep TypeScript, it's the industry standard
2. ~~Store everything in JSONB~~ — normalize what you query
3. ~~Normalize everything~~ — JSONB is fine for truly flexible data
4. ~~Skip the audit phase~~ — assumptions about auth and user data are dangerous
5. ~~Deploy everything at once~~ — use feature flags and gradual rollout
6. ~~Build a gateway with two databases~~ — overkill for this scale
7. ~~Force-push shared branches~~ — coordinate with team first
8. ~~Skip integration tests~~ — this is a merge, not a feature addition
9. ~~Estimate 18–22 hours~~ — realistic timeline is 8–11 business days
10. ~~Forget Iranian-specific concerns~~ — calendar, currency, SMS auth, deploy platform

### Gateway vs. Monolith: When to Reconsider

If ANY of these become true in the future, revisit the gateway architecture:

- Team grows beyond 4–5 backend developers
- Loan module needs independent scaling (high traffic on calculators)
- You add 3+ more feature modules (insurance, credit scoring, etc.)
- Different modules need different deployment cadences
- You need to serve the loan API to external partners

The modular monolith is designed to make this transition smooth — each module already has clear boundaries and can be extracted to a microservice when the need arises.

---

*This analysis is based on the provided merge plan, the review document, and industry best practices for FastAPI application architecture. Implementation details should be verified against the actual codebase during the Phase 0 audit.*
