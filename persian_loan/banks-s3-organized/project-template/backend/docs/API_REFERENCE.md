# API Reference

**Iranian Banks Loan Dashboard -- REST API v1.0.0**

Base URL: `http://localhost:8000/api`

Interactive docs: `http://localhost:8000/docs` (Swagger UI) | `http://localhost:8000/redoc` (ReDoc)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Standard Response Envelope](#standard-response-envelope)
4. [Pagination](#pagination)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)
7. [Caching Behavior](#caching-behavior)
8. [Correlation IDs](#correlation-ids)
9. [Endpoints: Authentication](#endpoints-authentication)
10. [Endpoints: Banks](#endpoints-banks)
11. [Endpoints: Loans](#endpoints-loans)
12. [Endpoints: Analytics](#endpoints-analytics)
13. [Endpoints: Import](#endpoints-import)
14. [Endpoints: Reminders](#endpoints-reminders)
15. [Endpoints: Health](#endpoints-health)
16. [Code Examples](#code-examples)

---

## Overview

The API follows a modular architecture with six core modules:

| Module       | Prefix               | Description                            |
|--------------|----------------------|----------------------------------------|
| Auth         | `/api/auth`          | User registration, login, JWT tokens   |
| Banks        | `/api/banks`         | Bank data CRUD operations              |
| Loans        | `/api/loans`         | Loan filtering, comparison             |
| Analytics    | `/api/analytics`     | Aggregated statistics and analysis     |
| Import       | `/api/import`        | File upload, OCR, web scraping         |
| Reminders    | `/api/reminders`     | User loans, payment schedules, alerts  |

### Technology Stack

- **Framework**: FastAPI 0.109+
- **Database**: MongoDB via Motor (async driver)
- **Cache**: Redis via redis-py (async)
- **Authentication**: JWT (HS256) via python-jose
- **Rate Limiting**: SlowAPI (fixed-window strategy)
- **Validation**: Pydantic v2

---

## Authentication

All endpoints except public reads require a JWT Bearer token.

```
Authorization: Bearer <access_token>
```

### Token Types

| Token         | Lifetime   | Purpose                   |
|---------------|------------|---------------------------|
| Access Token  | 15 minutes | API request authorization  |
| Refresh Token | 7 days     | Obtain new access tokens   |

### Token Payload (JWT Claims)

```json
{
  "sub": "user_id",
  "username": "john_doe",
  "role": "user",
  "exp": 1707123456,
  "type": "access"
}
```

See [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) for the complete authentication flow.

---

## Standard Response Envelope

All API responses use the `ApiResponse` envelope format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-05T10:00:00Z",
    "pagination": null,
    "cached": false,
    "cache_ttl": null
  },
  "errors": null
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-02-05T10:00:00Z",
    "pagination": {
      "total": 100,
      "page": 1,
      "page_size": 20,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    },
    "cached": false,
    "cache_ttl": null
  },
  "errors": null
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "meta": {
    "timestamp": "2026-02-05T10:00:00Z"
  },
  "errors": [
    {
      "code": "BANK_NOT_FOUND",
      "message": "Bank with id 'xyz' not found",
      "field": null,
      "details": null
    }
  ]
}
```

### Response Fields

| Field               | Type              | Description                                   |
|---------------------|-------------------|-----------------------------------------------|
| `success`           | `boolean`         | Whether the request was successful             |
| `data`              | `T \| null`       | Response payload (null for errors)             |
| `meta.timestamp`    | `string`          | ISO 8601 UTC timestamp                         |
| `meta.pagination`   | `object \| null`  | Pagination metadata (list endpoints only)      |
| `meta.cached`       | `boolean`         | Whether served from Redis cache                |
| `meta.cache_ttl`    | `int \| null`     | Cache TTL in seconds (when cached)             |
| `errors`            | `array \| null`   | List of error details (null for success)       |

---

## Pagination

List endpoints support page-based pagination with these query parameters:

| Parameter   | Type  | Default | Range   | Description                    |
|-------------|-------|---------|---------|--------------------------------|
| `page`      | `int` | `1`     | >= 1    | Page number (1-indexed)        |
| `page_size` | `int` | `20`    | 1--100  | Number of items per page       |

### Pagination Metadata

| Field         | Type      | Description                            |
|---------------|-----------|----------------------------------------|
| `total`       | `int`     | Total items across all pages           |
| `page`        | `int`     | Current page number                    |
| `page_size`   | `int`     | Items per page                         |
| `total_pages` | `int`     | Total number of pages                  |
| `has_next`    | `boolean` | Whether a next page exists             |
| `has_prev`    | `boolean` | Whether a previous page exists         |

### Example

```
GET /api/banks/?page=2&page_size=10
```

---

## Rate Limiting

Rate limits are enforced per client IP using a fixed-window strategy.

| Tier        | Limit          | Applied To                                |
|-------------|----------------|-------------------------------------------|
| Default     | 100 req/min    | All undecorated endpoints                  |
| Auth        | 5 req/min      | `/api/auth/login`, `/api/auth/register`    |
| Read        | 200 req/min    | All `GET` endpoints                        |
| Write       | 20 req/min     | All `POST`, `PUT`, `DELETE` endpoints      |

### Response Headers

| Header                  | Description                             |
|-------------------------|-----------------------------------------|
| `X-RateLimit-Limit`     | Maximum requests allowed in the window  |
| `X-RateLimit-Remaining` | Remaining requests in current window    |
| `X-RateLimit-Reset`     | Seconds until rate limit resets         |

### 429 Too Many Requests

When the rate limit is exceeded, the API responds with HTTP 429:

```json
{
  "error": "Rate limit exceeded: 5 per 1 minute"
}
```

**Storage backend**: Redis (if available) or in-memory fallback.

---

## Error Handling

### HTTP Status Codes

| Code | Meaning                | When                                          |
|------|------------------------|-----------------------------------------------|
| 200  | OK                     | Successful GET, PUT, PATCH                     |
| 201  | Created                | Successful POST (resource created)             |
| 204  | No Content             | Successful DELETE (logout)                     |
| 400  | Bad Request            | Invalid input, duplicate username/email        |
| 401  | Unauthorized           | Missing/invalid/expired token                  |
| 403  | Forbidden              | Insufficient permissions, inactive account     |
| 404  | Not Found              | Resource does not exist                        |
| 422  | Unprocessable Entity   | Validation error (Pydantic)                    |
| 429  | Too Many Requests      | Rate limit exceeded                            |
| 500  | Internal Server Error  | Unexpected server error                        |

### Error Codes

| Code                  | Description                                     |
|-----------------------|-------------------------------------------------|
| `BANK_NOT_FOUND`      | Bank with given ID does not exist                |
| `LOAN_NOT_FOUND`      | Loan with given ID does not exist                |
| `VALIDATION_ERROR`    | Request body failed Pydantic validation          |
| `DUPLICATE_USERNAME`  | Username already registered                      |
| `DUPLICATE_EMAIL`     | Email already registered                         |
| `INVALID_CREDENTIALS` | Incorrect username or password                   |
| `TOKEN_EXPIRED`       | JWT access or refresh token has expired           |
| `TOKEN_INVALID`       | JWT token is malformed or unverifiable            |
| `PERMISSION_DENIED`   | User lacks required role for the endpoint         |
| `RATE_LIMIT_EXCEEDED` | Client has exceeded the rate limit                |

### Custom Exceptions

The API defines three custom exception classes:

- **`AppException`**: Base exception (status 500)
- **`NotFoundException`**: Resource not found (status 404)
- **`ValidationException`**: Validation error (status 422)

---

## Caching Behavior

Responses are cached using Redis with tag-based invalidation. See [CACHING_GUIDE.md](./CACHING_GUIDE.md) for full details.

### Cache Tiers by Endpoint

| Tier   | TTL   | Endpoints                                                     |
|--------|-------|---------------------------------------------------------------|
| Tier 1 | 300s  | `GET /banks/`, `/banks/traditional`, `/banks/digital`          |
|        |       | `GET /analytics/summary/`, `/analytics/by-category/`           |
|        |       | `GET /analytics/interest-rates/`, `/analytics/loan-amounts/`   |
|        |       | `GET /analytics/requirements-matrix/`                          |
| Tier 2 | 180s  | `GET /banks/{id}`, `/banks/{id}/loans`                         |
|        |       | `GET /loans/`, `/loans/no-guarantor/`, `/loans/by-method/{m}/` |
| Tier 3 | 120s  | `GET /loans/compare/`                                          |
| None   | --    | All auth endpoints, POST/PUT/DELETE mutations, reminders       |

### Cache Invalidation

Mutation endpoints automatically invalidate related caches:

| Mutation              | Invalidated Tags           |
|-----------------------|----------------------------|
| `POST /banks/`        | `banks`, `analytics`       |
| `DELETE /banks/{id}`  | `banks`, `analytics`       |

---

## Correlation IDs

Every request is assigned a unique correlation ID (UUID4) for tracing.

- **Request**: Send `X-Correlation-ID` header to propagate your own ID.
- **Response**: The `X-Correlation-ID` header is always returned.
- **Logs**: All log entries include the correlation ID.

---

## Endpoints: Authentication

### POST `/api/auth/register`

Register a new user account.

**Rate Limit**: 5 req/min

**Request Body**:

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "user"
}
```

| Field      | Type     | Required | Constraints                                   |
|------------|----------|----------|-----------------------------------------------|
| `username` | `string` | Yes      | 3--50 chars, alphanumeric + underscore only    |
| `email`    | `string` | Yes      | Valid email address                            |
| `password` | `string` | Yes      | 8--100 chars, must have upper, lower, digit    |
| `role`     | `string` | No       | `"user"` (default) or `"admin"`                |

**Response** (201 Created):

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2026-02-05T10:00:00Z"
}
```

**Errors**: 400 (duplicate username/email), 422 (validation), 429 (rate limit)

---

### POST `/api/auth/login`

Authenticate and receive JWT tokens.

**Rate Limit**: 5 req/min

**Request Body**:

```json
{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

**Response** (200 OK):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

| Field           | Type     | Description                           |
|-----------------|----------|---------------------------------------|
| `access_token`  | `string` | JWT access token (15 min)             |
| `refresh_token` | `string` | JWT refresh token (7 days)            |
| `token_type`    | `string` | Always `"bearer"`                     |
| `expires_in`    | `int`    | Access token TTL in seconds (900)     |

**Errors**: 401 (invalid credentials), 403 (inactive account), 429 (rate limit)

---

### POST `/api/auth/refresh`

Get a new access token using a valid refresh token.

**Rate Limit**: 20 req/min

**Request Body**:

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK): Same as login response. Old refresh token is revoked.

**Errors**: 401 (invalid/expired/revoked token)

---

### POST `/api/auth/logout`

Logout by revoking all refresh tokens for the user.

**Rate Limit**: 20 req/min

**Authentication**: Required (Bearer token)

**Response**: 204 No Content

---

### GET `/api/auth/me`

Get the current authenticated user's profile.

**Rate Limit**: 20 req/min

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2026-02-05T10:00:00Z"
}
```

---

### POST `/api/auth/cleanup-tokens`

Clean up expired refresh tokens from the database. **Admin only.**

**Rate Limit**: 20 req/min

**Authentication**: Required (Bearer token, admin role)

**Response** (200 OK):

```json
{
  "message": "Deleted 42 expired tokens"
}
```

**Errors**: 403 (not admin)

---

## Endpoints: Banks

### GET `/api/banks/`

Get all banks with optional filtering and pagination.

**Rate Limit**: 200 req/min | **Cache**: Tier 1 (300s TTL, tag: `banks`)

**Query Parameters**:

| Parameter   | Type     | Default | Description                    |
|-------------|----------|---------|--------------------------------|
| `category`  | `string` | --      | Filter by category             |
| `type`      | `string` | --      | Filter by bank type            |
| `page`      | `int`    | `1`     | Page number (1-indexed)        |
| `page_size` | `int`    | `20`    | Items per page (1--100)        |

**Response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "bank_melli",
      "nameFA": "بانک ملی",
      "nameEN": "Bank Melli",
      "category": "traditional-banks",
      "loansCount": 5
    }
  ],
  "meta": {
    "timestamp": "2026-02-05T10:00:00Z",
    "pagination": {
      "total": 25,
      "page": 1,
      "page_size": 20,
      "total_pages": 2,
      "has_next": true,
      "has_prev": false
    }
  },
  "errors": null
}
```

---

### GET `/api/banks/traditional`

Get all traditional banks.

**Rate Limit**: 200 req/min | **Cache**: Tier 1 (300s TTL, tag: `banks`)

**Response** (200 OK):

```json
{
  "items": [ ... ],
  "total": 15
}
```

---

### GET `/api/banks/digital`

Get all digital banks.

**Rate Limit**: 200 req/min | **Cache**: Tier 1 (300s TTL, tag: `banks`)

**Response**: Same structure as `/banks/traditional`.

---

### GET `/api/banks/{bank_id}`

Get a specific bank by ID with full details.

**Rate Limit**: 200 req/min | **Cache**: Tier 2 (180s TTL, tag: `banks`)

**Path Parameters**:

| Parameter | Type     | Description         |
|-----------|----------|---------------------|
| `bank_id` | `string` | Bank identifier     |

**Response** (200 OK): Full bank object including all loan types, requirements, scoring systems, coefficient tables, and other metadata.

**Errors**: 404 (bank not found)

---

### GET `/api/banks/{bank_id}/loans`

Get all loans for a specific bank.

**Rate Limit**: 200 req/min | **Cache**: Tier 2 (180s TTL, tags: `banks`, `loans`)

**Response** (200 OK):

```json
{
  "bankId": "bank_melli",
  "bankNameFA": "بانک ملی",
  "bankNameEN": "Bank Melli",
  "loans": [ ... ]
}
```

---

### POST `/api/banks/`

Create a new bank.

**Rate Limit**: 20 req/min | **Cache Invalidation**: tags `banks`, `analytics`

**Request Body**: Bank creation object (see BankCreate schema in OpenAPI docs).

**Response** (200 OK): Created bank object.

---

### DELETE `/api/banks/{bank_id}`

Delete a bank by ID.

**Rate Limit**: 20 req/min | **Cache Invalidation**: tags `banks`, `analytics`

**Response** (200 OK): Deletion confirmation.

**Errors**: 404 (bank not found)

---

## Endpoints: Loans

### GET `/api/loans/`

Get all loans with optional filtering and pagination.

**Rate Limit**: 200 req/min | **Cache**: Tier 2 (180s TTL, tag: `loans`)

**Query Parameters**:

| Parameter            | Type     | Default | Description                          |
|----------------------|----------|---------|--------------------------------------|
| `no_guarantor`       | `bool`   | --      | Filter for loans without guarantor   |
| `calculation_method` | `string` | --      | Filter by calculation method         |
| `page`               | `int`    | `1`     | Page number (1-indexed)              |
| `page_size`          | `int`    | `20`    | Items per page (1--100)              |

**Response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "bankId": "bank_melli",
      "bankNameFA": "بانک ملی",
      "bankCategory": "traditional-banks",
      "loanId": "loan_1",
      "nameFA": "وام مسکن",
      "interestRate": "23%",
      "maxAmount": "500,000,000"
    }
  ],
  "meta": {
    "pagination": {
      "total": 85,
      "page": 1,
      "page_size": 20,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  },
  "errors": null
}
```

---

### GET `/api/loans/no-guarantor/`

Get all loans that do not require a guarantor.

**Rate Limit**: 200 req/min | **Cache**: Tier 2 (180s TTL, tag: `loans`)

**Response** (200 OK):

```json
{
  "total": 12,
  "items": [ ... ]
}
```

---

### GET `/api/loans/by-method/{method}/`

Get loans filtered by calculation method.

**Rate Limit**: 200 req/min | **Cache**: Tier 2 (180s TTL, tag: `loans`)

**Path Parameters**:

| Parameter | Type     | Description                                 |
|-----------|----------|---------------------------------------------|
| `method`  | `string` | Calculation method (e.g., `"equal"`, `"reducing"`) |

---

### GET `/api/loans/compare/`

Compare multiple loans side by side.

**Rate Limit**: 200 req/min | **Cache**: Tier 3 (120s TTL, tag: `loans`)

**Query Parameters**:

| Parameter  | Type     | Required | Description                                          |
|------------|----------|----------|------------------------------------------------------|
| `loan_ids` | `string` | Yes      | Comma-separated loan IDs (format: `bankId:loanId`)   |

**Example**: `GET /api/loans/compare/?loan_ids=melli:loan1,saderat:loan2`

**Response** (200 OK):

```json
{
  "comparison": [
    {
      "bankId": "melli",
      "loanId": "loan1",
      "nameFA": "...",
      "interestRate": "...",
      "maxAmount": "..."
    }
  ],
  "total_compared": 2
}
```

---

## Endpoints: Analytics

All analytics endpoints use Tier 1 caching (300s TTL).

### GET `/api/analytics/summary/`

Get overall summary statistics.

**Cache**: 300s TTL, tags: `analytics`, `banks`

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "totalBanks": 25,
    "traditionalBanks": 15,
    "digitalBanks": 10,
    "totalLoans": 85,
    "noGuarantorLoans": 12,
    "calculationMethods": {
      "equal_installments": 45,
      "reducing_balance": 20,
      "other": 20
    }
  },
  "meta": { "timestamp": "..." },
  "errors": null
}
```

---

### GET `/api/analytics/by-category/`

Get banks grouped by category.

**Cache**: 300s TTL, tags: `analytics`, `banks`

**Response** (200 OK):

```json
{
  "traditional_banks": [
    { "id": "melli", "nameFA": "بانک ملی", "nameEN": "Bank Melli", "loansCount": 5 }
  ],
  "digital_banks": [
    { "id": "blu", "nameFA": "بلوبانک", "nameEN": "Blu Bank", "loansCount": 3 }
  ]
}
```

---

### GET `/api/analytics/interest-rates/`

Get interest rate distribution across all banks.

**Cache**: 300s TTL, tags: `analytics`, `loans`

**Response** (200 OK):

```json
{
  "distribution": {
    "4%": [ { "bankId": "...", "bankNameFA": "...", "loanId": "...", "loanNameFA": "...", "interestRate": "4%" } ],
    "23%": [ ... ]
  },
  "avg_rate": 15.5,
  "min_rate": 4.0,
  "max_rate": 23.0
}
```

---

### GET `/api/analytics/loan-amounts/`

Get loan amount ranges for each bank.

**Cache**: 300s TTL, tags: `analytics`, `loans`

**Response** (200 OK):

```json
{
  "banks": [
    {
      "bankId": "melli",
      "bankNameFA": "بانک ملی",
      "bankCategory": "traditional-banks",
      "loans": [
        { "loanId": "loan1", "loanNameFA": "...", "minAmount": "10000000", "maxAmount": "500000000" }
      ]
    }
  ],
  "total_banks": 25
}
```

---

### GET `/api/analytics/requirements-matrix/`

Get requirements matrix for all banks.

**Cache**: 300s TTL, tags: `analytics`, `banks`

**Response** (200 OK):

```json
{
  "matrix": [
    {
      "bankId": "melli",
      "bankNameFA": "بانک ملی",
      "category": "traditional-banks",
      "requirements": {
        "guarantor": true,
        "check": true,
        "promissoryNote": true,
        "creditRating": "A",
        "noBadChecks": true,
        "noOverdueDebts": true,
        "onlineCreditCheck": true
      }
    }
  ],
  "total_banks": 25
}
```

---

## Endpoints: Import

### POST `/api/import/upload`

Upload a file for OCR processing.

**Request**: Multipart form data with `file` field.

| Constraint     | Value                         |
|----------------|-------------------------------|
| Max file size  | 10 MB                         |
| Allowed types  | PNG, JPEG, JPG, PDF           |

**Response** (200 OK):

```json
{
  "file_id": "abc123",
  "filename": "document.pdf",
  "size": 1024000,
  "content_type": "application/pdf"
}
```

---

### POST `/api/import/ocr/{file_id}`

Process an uploaded file with OCR.

**Form Data**:

| Parameter  | Type     | Default         | Description                              |
|------------|----------|-----------------|------------------------------------------|
| `language` | `string` | `"fas+eng"`     | OCR language: `fas`, `eng`, `fas+eng`    |

**Response** (200 OK):

```json
{
  "file_id": "abc123",
  "language": "fas+eng",
  "text": "Extracted text content...",
  "confidence": 0.95,
  "page_count": 3
}
```

---

### POST `/api/import/web`

Scrape web URLs for loan data.

**Request Body**:

```json
{
  "urls": ["https://example.com/loans"],
  "deep_scrape": false
}
```

| Constraint  | Value            |
|-------------|------------------|
| Max URLs    | 10 per request   |

---

### GET `/api/import/status/{import_id}`

Get the status of an import operation.

**Response** (200 OK): Import status object with type, status, source, results.

---

### GET `/api/import/list`

Get list of all imports.

**Query Parameters**:

| Parameter     | Type     | Default | Description                                    |
|---------------|----------|---------|------------------------------------------------|
| `limit`       | `int`    | `50`    | Max items to return (1--100)                   |
| `import_type` | `string` | --      | Filter: `ocr`, `web_scraping`, `manual`        |

---

### GET `/api/import/stats`

Get import statistics (total imports, breakdown by type and status).

---

## Endpoints: Reminders

### POST `/api/reminders/loans`

Create a new user loan with payment schedule.

**Request Body**: `UserLoanCreate` schema with principal, interest rate, term, loan type, etc.

**Response** (201 Created): Loan object with generated payment schedule.

---

### GET `/api/reminders/loans`

Get all loans for a user.

**Query Parameters**:

| Parameter    | Type     | Required | Default | Description               |
|--------------|----------|----------|---------|---------------------------|
| `userId`     | `string` | Yes      | --      | User ID                   |
| `activeOnly` | `bool`   | No       | `true`  | Only return active loans  |

---

### GET `/api/reminders/loans/{loan_id}`

Get a specific loan by ID.

**Query Parameters**:

| Parameter         | Type   | Default | Description                    |
|-------------------|--------|---------|--------------------------------|
| `includeSchedule` | `bool` | `true`  | Include payment schedule       |

---

### PUT `/api/reminders/loans/{loan_id}`

Update a loan. If financial parameters change, the payment schedule is recalculated.

---

### DELETE `/api/reminders/loans/{loan_id}`

Delete a loan (soft delete by default).

**Query Parameters**:

| Parameter    | Type   | Default | Description                    |
|--------------|--------|---------|--------------------------------|
| `hardDelete` | `bool` | `false` | Permanently delete the loan    |

---

### POST `/api/reminders/loans/{loan_id}/payments/{installment_number}/pay`

Mark a payment installment as paid.

**Query Parameters**:

| Parameter    | Type     | Required | Description            |
|--------------|----------|----------|------------------------|
| `paidAmount` | `string` | No       | Amount paid            |
| `paidDate`   | `date`   | No       | Date of payment        |

---

### GET `/api/reminders/alerts`

Get upcoming payment alerts for a user.

**Query Parameters**:

| Parameter   | Type     | Required | Default | Description              |
|-------------|----------|----------|---------|--------------------------|
| `userId`    | `string` | Yes      | --      | User ID                  |
| `daysAhead` | `int`    | No       | `30`    | Days to look ahead (1-90)|

**Response** includes overdue, urgent (within 3 days), and upcoming payments.

---

### POST `/api/reminders/calculate`

Calculate a loan payment schedule without saving.

**Request Body**: `PaymentCalculationRequest` with loan type, principal, rate, term.

Supported loan types:
- `equal_installments`: Fixed monthly payment (most common)
- `reducing_balance`: Decreasing payments over time
- `graduated`: Payments increase annually
- `balloon`: Interest only with final balloon payment
- `interest_only`: Only interest paid, principal unchanged

---

## Endpoints: Health

### GET `/`

Root endpoint returning API information.

**Rate Limit**: 200 req/min

**Response** (200 OK):

```json
{
  "name": "Iranian Banks Loan Dashboard",
  "version": "1.0.0",
  "docs": "/docs",
  "api": "/api"
}
```

---

### GET `/health`

Enhanced health check with component-level status.

**Rate Limit**: 200 req/min

**Response** (200 OK):

```json
{
  "status": "healthy",
  "timestamp": "2026-02-05T10:00:00.000000+00:00",
  "version": "1.0.0",
  "components": {
    "database": {
      "status": "connected",
      "type": "mongodb"
    },
    "cache": {
      "status": "connected",
      "type": "redis",
      "keys": 42,
      "memory": "1.5M"
    },
    "rate_limiter": {
      "status": "active",
      "type": "slowapi"
    }
  }
}
```

**Status Values**:

| Overall Status | Meaning                              |
|----------------|--------------------------------------|
| `healthy`      | All critical components operational  |
| `degraded`     | Database disconnected                |

---

## Code Examples

### Python (httpx)

```python
import httpx

BASE_URL = "http://localhost:8000/api"

# --- Login ---
response = httpx.post(f"{BASE_URL}/auth/login", json={
    "username": "john_doe",
    "password": "SecurePass123"
})
tokens = response.json()
access_token = tokens["access_token"]

headers = {"Authorization": f"Bearer {access_token}"}

# --- Get all banks (paginated) ---
response = httpx.get(
    f"{BASE_URL}/banks/",
    params={"page": 1, "page_size": 10},
    headers=headers
)
result = response.json()
banks = result["data"]
pagination = result["meta"]["pagination"]
print(f"Page {pagination['page']} of {pagination['total_pages']}")
print(f"Total banks: {pagination['total']}")

# --- Get a specific bank ---
bank = httpx.get(f"{BASE_URL}/banks/melli", headers=headers).json()

# --- Get analytics summary ---
summary = httpx.get(f"{BASE_URL}/analytics/summary/", headers=headers).json()
print(f"Total loans: {summary['data']['totalLoans']}")

# --- Get loans with filtering ---
loans = httpx.get(
    f"{BASE_URL}/loans/",
    params={"no_guarantor": True, "page_size": 50},
    headers=headers
).json()

# --- Compare loans ---
comparison = httpx.get(
    f"{BASE_URL}/loans/compare/",
    params={"loan_ids": "melli:loan1,saderat:loan2"},
    headers=headers
).json()

# --- Refresh token ---
new_tokens = httpx.post(f"{BASE_URL}/auth/refresh", json={
    "refresh_token": tokens["refresh_token"]
}).json()

# --- Check API health ---
health = httpx.get("http://localhost:8000/health").json()
print(f"Status: {health['status']}")
```

### Python (requests)

```python
import requests

BASE_URL = "http://localhost:8000/api"
session = requests.Session()

# Login
resp = session.post(f"{BASE_URL}/auth/login", json={
    "username": "john_doe",
    "password": "SecurePass123"
})
tokens = resp.json()
session.headers.update({"Authorization": f"Bearer {tokens['access_token']}"})

# Fetch all banks
banks_resp = session.get(f"{BASE_URL}/banks/", params={"page": 1, "page_size": 20})
data = banks_resp.json()

for bank in data["data"]:
    print(f"{bank['nameFA']} ({bank['nameEN']}) - {bank['loansCount']} loans")
```

### JavaScript / TypeScript (fetch)

```typescript
const BASE_URL = "http://localhost:8000/api";

// --- Login ---
const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "john_doe",
    password: "SecurePass123",
  }),
});
const tokens = await loginResponse.json();
const headers = {
  Authorization: `Bearer ${tokens.access_token}`,
  "Content-Type": "application/json",
};

// --- Get all banks (paginated) ---
const banksResponse = await fetch(
  `${BASE_URL}/banks/?page=1&page_size=10`,
  { headers }
);
const banksResult = await banksResponse.json();

if (banksResult.success) {
  console.log(`Total: ${banksResult.meta.pagination.total}`);
  banksResult.data.forEach((bank: any) => {
    console.log(`${bank.nameFA} - ${bank.loansCount} loans`);
  });
}

// --- Handle rate limiting ---
const response = await fetch(`${BASE_URL}/loans/`, { headers });
if (response.status === 429) {
  const retryAfter = response.headers.get("X-RateLimit-Reset");
  console.log(`Rate limited. Retry after ${retryAfter}s`);
}

// --- Error handling ---
const bankResponse = await fetch(`${BASE_URL}/banks/nonexistent`, { headers });
const bankResult = await bankResponse.json();
if (!bankResult.success && bankResult.errors) {
  bankResult.errors.forEach((err: any) => {
    console.error(`[${err.code}] ${err.message}`);
  });
}
```

### TypeScript (axios)

```typescript
import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// Request interceptor: add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 and refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            "http://localhost:8000/api/auth/refresh",
            { refresh_token: refreshToken }
          );
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          // Retry original request
          error.config!.headers.Authorization = `Bearer ${data.access_token}`;
          return axios(error.config!);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Usage
const { data } = await api.get("/banks/", { params: { page: 1, page_size: 20 } });
console.log(data.data); // Array of banks
console.log(data.meta.pagination); // Pagination info
```
