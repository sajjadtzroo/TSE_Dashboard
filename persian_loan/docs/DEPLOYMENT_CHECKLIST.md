# Production Deployment Checklist

> Iranian Banks Loan Dashboard - Deployment Readiness Verification
> Generated: 2026-02-05

---

## Pre-Deployment

### Testing

- [ ] **All backend tests passing**
  - Current: 281 passed, 27 failed, 19 skipped (327 total)
  - Failed tests are in: `test_analytics.py` (7), `test_banks.py` (6), `test_loans.py` (14)
  - Root cause: Tests expect old response format; API was migrated to new standardized `ApiResponse` envelope
  - Action required: Update test assertions to match new response structure (`meta.pagination.total` instead of `total` at root)

- [ ] **All frontend tests passing**
  - Current: 1477 passed, 57 failed (1534 total across 44 test files)
  - 35 test files pass, 9 test files have failures
  - Failed test files:
    - `BankCard.test.tsx` (25 failures) - component rendering issues
    - `PersianDatePicker.test.tsx` (11 failures) - date picker interaction tests
    - `loans.service.test.ts` (5 failures) - service response format mismatch
    - `banks.service.test.ts` (4 failures) - service response format mismatch
    - `PercentageInput.test.tsx` (4 failures) - value change handling
    - `persianNumber.test.ts` (3 failures) - number formatting edge cases
    - `LoanCard.test.tsx` (4 failures) - card rendering
    - `StatCard.test.tsx` (1 failure) - memoization name check
    - `OptimizerResultsTable.test.tsx` (0 tests) - empty test file

- [ ] **Backend test coverage meets minimum (80%)**
  - Current: 51.68% (target: 80%)
  - Well-covered modules: loans (97-100%), banks (94-100%), auth (66-100%), analytics (64-100%)
  - Low-coverage modules: import_data (20-35%), reminders (10-81%), scraper (15%), routers/ (0%)
  - Action: Increase coverage in import, reminders, and scraper modules

- [ ] **Frontend test coverage meets minimum (50%)**
  - Current: Coverage report not generated due to test failures
  - Threshold configured at 70% (lines, functions, branches, statements)
  - Action: Fix failing tests first, then evaluate coverage

### Environment Configuration

- [ ] **Environment variables configured**
  - `MONGODB_URL` - MongoDB connection string
  - `DATABASE_NAME` - Database name (default: `iranian_banks`)
  - `CORS_ORIGINS` - Comma-separated allowed origins (NO wildcards in production)
  - `SECRET_KEY` - JWT signing secret (MUST change from default)
  - `JWT_ALGORITHM` - Default: HS256
  - `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` - Default: 15
  - `JWT_REFRESH_TOKEN_EXPIRE_DAYS` - Default: 7
  - `REDIS_URL` - Redis connection string
  - `CACHE_ENABLED` - Enable/disable caching (default: true)
  - `CACHE_DEFAULT_TTL` - Cache TTL in seconds (default: 300)
  - `DEBUG` - Must be `false` in production
  - `API_PREFIX` - API route prefix (default: `/api`)

- [ ] **MongoDB connection verified**
  - Connection string points to production cluster
  - Authentication credentials configured
  - Network access (IP whitelist) configured
  - Connection pooling parameters set

- [ ] **Redis connection verified (optional but recommended)**
  - Connection string points to production Redis instance
  - Authentication configured if required
  - Memory limits set
  - Persistence configured (RDB/AOF)
  - Fallback behavior verified (app works without Redis)

- [ ] **Schema validators applied**
  - MongoDB schema validators for `banks` collection
  - MongoDB schema validators for `users` collection
  - Run migration scripts from `scripts/` directory

- [ ] **Database indexes created**
  - Banks collection: `bankId` (unique), `category`, `nameFA`, `nameEN`
  - Users collection: `email` (unique), `username` (unique)
  - Loans embedded in banks: indexed via bank queries
  - Run `ensure_indexes()` on startup (handled by lifespan)

- [ ] **Secrets properly stored (not in code)**
  - JWT `SECRET_KEY` is unique, random, >= 32 characters
  - Database credentials in environment variables or secrets manager
  - Redis password in environment variables
  - No secrets in `.env` files committed to git
  - `.env` is in `.gitignore`

---

## Security

- [ ] **JWT secret key configured (not default)**
  - Default value `CHANGE_THIS_TO_A_SECURE_SECRET_KEY_IN_PRODUCTION` MUST be replaced
  - Generate with: `python -c "import secrets; print(secrets.token_urlsafe(64))"`
  - Store in environment variable or secrets manager

- [ ] **CORS origins properly configured (no wildcards)**
  - `CORS_ORIGINS` set to specific production domains
  - Application rejects wildcard `*` when `DEBUG=false`
  - Allowed methods: GET, POST, PUT, DELETE, PATCH
  - Allowed headers: Content-Type, Authorization, X-Correlation-ID
  - Exposed headers: X-Correlation-ID, X-RateLimit-*

- [ ] **Rate limiting enabled**
  - SlowAPI rate limiter active
  - Read endpoints: rate limited (configurable)
  - Auth endpoints: stricter limits (5/minute for login)
  - Write endpoints: rate limited
  - Rate limit headers exposed: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

- [ ] **Security logging enabled**
  - Security event logging via `app.common.middleware`
  - Failed authentication attempts logged
  - Rate limit violations logged
  - Correlation IDs attached to all requests
  - Log output directed to persistent storage

- [ ] **Input validation active**
  - Pydantic v2 models with strict validation
  - Custom validators for Persian text, amounts, rates
  - Email validation enabled
  - Request body size limits configured

- [ ] **HTTPS configured (production)**
  - TLS certificate installed (Let's Encrypt or similar)
  - HTTP to HTTPS redirect enabled
  - HSTS headers configured
  - Secure cookie flags set (if using cookies)

---

## Performance

- [ ] **Redis caching enabled**
  - `CACHE_ENABLED=true` in environment
  - Cache TTL appropriate for data freshness needs
  - Cache key prefix configured (`ploan:cache`)
  - Cache invalidation strategy documented
  - `@cached` decorator applied to high-traffic endpoints

- [ ] **Database indexes verified**
  - Run `db.banks.getIndexes()` to verify indexes exist
  - Explain plans show index usage for common queries
  - No collection scans for paginated queries

- [ ] **Frontend build optimized**
  - Production build: `npm run build`
  - Vite tree-shaking enabled
  - Code splitting via React.lazy() for routes
  - Build output in `/dist` directory
  - Source maps disabled for production (or uploaded to error tracker)

- [ ] **Static assets compressed**
  - Gzip/Brotli compression enabled on web server
  - Image assets optimized
  - CSS/JS minified (Vite handles this)
  - Font files (Vazirmatn) properly cached

- [ ] **CDN configured (if applicable)**
  - Static assets served from CDN
  - Cache-Control headers set
  - Origin server protected

---

## Monitoring

- [ ] **Health check endpoint accessible**
  - GET `/health` returns component-level status
  - Checks: database connectivity, Redis connectivity, rate limiter status
  - Returns `healthy` or `degraded` overall status
  - Monitoring tool configured to poll health endpoint

- [ ] **Log aggregation configured**
  - Loguru logger outputs structured logs
  - Logs include correlation IDs for request tracing
  - Log level set to `INFO` for production (not `DEBUG`)
  - Logs shipped to aggregation service (ELK, CloudWatch, Datadog, etc.)
  - Log rotation configured if writing to files

- [ ] **Error tracking configured**
  - Unhandled exceptions captured
  - Error grouping and deduplication enabled
  - Alert thresholds set for error rates
  - Source maps uploaded (if using Sentry/similar)

- [ ] **Cache metrics monitored**
  - Redis memory usage tracked
  - Cache hit/miss ratio monitored
  - Cache key count monitored (via `/health` endpoint)
  - Alerts for cache unavailability

- [ ] **Security events logged**
  - Failed login attempts tracked
  - Rate limit violations logged
  - Unusual access patterns flagged
  - Authentication token issues logged

---

## Post-Deployment

- [ ] **Health check returns 200**
  ```bash
  curl -s https://your-domain.com/health | jq .
  # Expected: {"status": "healthy", "components": {"database": {"status": "connected"}, ...}}
  ```

- [ ] **Authentication working**
  ```bash
  # Register
  curl -X POST https://your-domain.com/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username": "test", "email": "test@example.com", "password": "SecurePass123!"}'

  # Login
  curl -X POST https://your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "test", "password": "SecurePass123!"}'
  ```

- [ ] **API endpoints responding**
  ```bash
  curl -s https://your-domain.com/api/banks | jq '.success'
  # Expected: true

  curl -s https://your-domain.com/api/loans | jq '.success'
  # Expected: true

  curl -s https://your-domain.com/api/analytics/summary | jq '.success'
  # Expected: true
  ```

- [ ] **Frontend accessible**
  - Navigate to production URL in browser
  - Verify page loads without console errors
  - Verify Persian text renders correctly
  - Verify RTL layout is correct
  - Verify navigation works between all pages

- [ ] **Critical user flows tested**
  - [ ] Browse banks and view details
  - [ ] Browse loans and view details
  - [ ] Use loan optimizer with filters
  - [ ] Compare loans side by side
  - [ ] Use WACC calculator
  - [ ] Use NPV calculator
  - [ ] Use IRR calculator
  - [ ] View analytics dashboard
  - [ ] Login and access protected features

- [ ] **Performance baselines established**
  - Record initial response times for key endpoints
  - Document page load times (Lighthouse score)
  - Set up performance monitoring alerts
  - Document expected traffic patterns

---

## Deployment Commands Reference

### Backend

```bash
# Build and start with Docker
docker build -t persian-loan-backend .
docker run -d --name backend \
  --env-file .env.production \
  -p 8000:8000 \
  persian-loan-backend

# Or with uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend

```bash
# Production build
npm run build

# Serve static files (with nginx, serve, etc.)
npx serve dist -l 3000
```

### Database

```bash
# Verify MongoDB connection
mongosh "mongodb://your-connection-string" --eval "db.adminCommand('ping')"

# Apply schema validators
python scripts/apply_schema_validators.py

# Seed initial data (if needed)
python scripts/seed_data.py
```

---

## Rollback Plan

If deployment fails:

1. **Immediate:** Switch load balancer back to previous version
2. **Database:** Schema validators are additive; no rollback needed unless data migration was performed
3. **Cache:** Flush Redis cache: `redis-cli FLUSHDB`
4. **DNS:** If using blue-green deployment, switch DNS back to previous environment
5. **Post-mortem:** Document what went wrong and update checklist
