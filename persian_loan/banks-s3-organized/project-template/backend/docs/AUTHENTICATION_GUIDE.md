# Authentication Guide

**Iranian Banks Loan Dashboard -- JWT Authentication System**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Registration Flow](#registration-flow)
4. [Login Flow](#login-flow)
5. [Token Refresh Mechanism](#token-refresh-mechanism)
6. [Logout and Token Cleanup](#logout-and-token-cleanup)
7. [Role-Based Access Control](#role-based-access-control)
8. [Protecting Routes](#protecting-routes)
9. [Security Best Practices](#security-best-practices)
10. [Rate Limiting on Auth Endpoints](#rate-limiting-on-auth-endpoints)
11. [Security Event Logging](#security-event-logging)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The authentication system uses JSON Web Tokens (JWT) with a dual-token strategy:

- **Access Token**: Short-lived (15 minutes), used for API authorization.
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens.

Both tokens are signed using the HS256 algorithm with a shared secret key.

### Key Design Decisions

- Refresh tokens are **hashed with bcrypt** before storage in MongoDB.
- Refresh tokens are **single-use** (revoked after each refresh).
- Passwords are hashed with **bcrypt** via passlib.
- Failed login attempts are logged to a dedicated security log file.
- Auth endpoints are rate-limited to **5 requests per minute** to mitigate brute-force attacks.

---

## Architecture

```
Client                    FastAPI                     MongoDB
  |                         |                            |
  |-- POST /auth/register ->|                            |
  |                         |-- hash password (bcrypt) ->|
  |                         |-- insert user ------------>|
  |<-- 201 UserResponse ----|                            |
  |                         |                            |
  |-- POST /auth/login ---->|                            |
  |                         |-- verify password -------->|
  |                         |-- create access JWT ------>|
  |                         |-- create refresh JWT ----->|
  |                         |-- store hashed refresh --->|
  |<-- 200 Token response --|                            |
  |                         |                            |
  |-- GET /api/banks/ ----->|                            |
  |   Authorization: Bearer |-- decode JWT               |
  |                         |-- verify expiration        |
  |                         |-- verify token type        |
  |                         |-- lookup user by ID ------>|
  |<-- 200 Banks data ------|                            |
```

### Module Structure

```
app/modules/auth/
  __init__.py          # Module exports
  dependencies.py      # FastAPI dependencies (get_current_user, require_role)
  jwt.py               # JWT creation and decoding
  models.py            # User and RefreshToken data models
  password.py          # bcrypt hashing utilities
  repository.py        # MongoDB operations for users and tokens
  router.py            # API endpoint definitions
  schemas.py           # Pydantic request/response schemas
  service.py           # Business logic
```

---

## Registration Flow

### Endpoint

```
POST /api/auth/register
```

### Steps

1. Client sends username, email, password, and optional role.
2. Server validates input using Pydantic schemas:
   - **Username**: 3--50 characters, alphanumeric + underscore only.
   - **Email**: Valid email format (via `email-validator`).
   - **Password**: Minimum 8 characters, must contain uppercase, lowercase, and digit.
3. Server checks for duplicate username and email in the database.
4. Password is hashed using **bcrypt** (via passlib).
5. User document is inserted into the `users` collection.
6. Server returns the created user profile (without password).

### Request

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "user"
}
```

### Response (201 Created)

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

### Error Cases

| Status | Condition                  | Message                        |
|--------|----------------------------|--------------------------------|
| 400    | Username already exists     | "Username already registered"  |
| 400    | Email already exists        | "Email already registered"     |
| 422    | Weak password              | Pydantic validation details    |
| 429    | Rate limit exceeded        | "Rate limit exceeded"          |

### Password Validation Rules

```python
# All four rules must be satisfied:
len(password) >= 8                     # Minimum 8 characters
any(c.isupper() for c in password)     # At least one uppercase letter
any(c.islower() for c in password)     # At least one lowercase letter
any(c.isdigit() for c in password)     # At least one digit
```

---

## Login Flow

### Endpoint

```
POST /api/auth/login
```

### Steps

1. Client sends username and password.
2. Server looks up user by username.
3. Server verifies password against stored bcrypt hash.
4. Server checks that the user account is active.
5. Server generates:
   - **Access token** (JWT, 15 minutes TTL).
   - **Refresh token** (JWT, 7 days TTL).
6. The refresh token is **hashed with bcrypt** and stored in the `refresh_tokens` collection.
7. Both tokens are returned to the client.

### Request

```json
{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

### Response (200 OK)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

### JWT Payload Structure

```json
{
  "sub": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "role": "user",
  "exp": 1707123456,
  "type": "access"
}
```

| Claim      | Description                                   |
|------------|-----------------------------------------------|
| `sub`      | User ID (MongoDB ObjectId as string)          |
| `username` | Username                                      |
| `role`     | User role (`"user"` or `"admin"`)             |
| `exp`      | Expiration time (Unix epoch)                   |
| `type`     | Token type (`"access"` or `"refresh"`)         |

### Using the Access Token

Include the access token in the `Authorization` header for all protected requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Cases

| Status | Condition                  | Message                              |
|--------|----------------------------|--------------------------------------|
| 401    | Wrong username or password | "Incorrect username or password"     |
| 403    | Account is inactive        | "User account is inactive"           |
| 429    | Rate limit exceeded        | "Rate limit exceeded"                |

---

## Token Refresh Mechanism

### Endpoint

```
POST /api/auth/refresh
```

### Steps

1. Client sends the current refresh token.
2. Server decodes the JWT and verifies:
   - Token is valid and not expired.
   - Token type is `"refresh"`.
3. Server looks up the user and verifies they are active.
4. Server looks up the hashed refresh token in the database:
   - Verifies it exists and is not revoked.
   - Verifies it has not expired.
5. The old refresh token is **revoked** (marked as `is_revoked = true`).
6. New access and refresh tokens are generated.
7. The new refresh token is hashed and stored.

### Request

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response (200 OK)

```json
{
  "access_token": "new_access_token...",
  "refresh_token": "new_refresh_token...",
  "token_type": "bearer",
  "expires_in": 900
}
```

### Token Rotation

The refresh mechanism implements **token rotation**:

- Each refresh token can only be used **once**.
- After use, the old token is revoked and a new one is issued.
- If a revoked token is presented, the server rejects it.
- This prevents replay attacks with stolen refresh tokens.

### Recommended Client-Side Strategy

```
1. Store access_token and refresh_token (e.g., localStorage or secure cookies).
2. On every API request:
   a. Include access_token in Authorization header.
   b. If you receive 401 Unauthorized:
      - Call POST /api/auth/refresh with the refresh_token.
      - Store the new tokens.
      - Retry the original request.
   c. If refresh also fails with 401:
      - Clear stored tokens.
      - Redirect user to login.
3. Proactive refresh: Check token expiry client-side.
   Refresh when access_token is within 60 seconds of expiring.
```

---

## Logout and Token Cleanup

### Logout Endpoint

```
POST /api/auth/logout
```

**Authentication**: Required (Bearer token).

**Steps**:

1. Server identifies the current user from the access token.
2. **All refresh tokens** for that user are revoked in the database.
3. Server returns 204 No Content.

The access token itself is **not invalidated** server-side (it will expire naturally in 15 minutes). For immediate invalidation, clients should discard the token.

### Token Cleanup Endpoint (Admin Only)

```
POST /api/auth/cleanup-tokens
```

**Authentication**: Required (admin role).

This endpoint deletes expired refresh tokens from the database, keeping the `refresh_tokens` collection clean. Schedule this periodically (e.g., daily cron job).

---

## Role-Based Access Control

### User Roles

| Role    | Value     | Capabilities                              |
|---------|-----------|-------------------------------------------|
| User    | `"user"`  | Standard API access                       |
| Admin   | `"admin"` | All user capabilities + admin endpoints   |

### Role Hierarchy

Admin users inherit all permissions of regular users. The role check logic:

```python
# Admin can access anything. Other roles need exact match.
if current_user.role != required_role and current_user.role != UserRole.ADMIN:
    raise HTTPException(403, "Insufficient permissions")
```

### Admin-Only Endpoints

| Endpoint                        | Description                    |
|---------------------------------|--------------------------------|
| `POST /api/auth/cleanup-tokens` | Delete expired refresh tokens  |

---

## Protecting Routes

### FastAPI Dependencies

The auth module provides several dependency functions for protecting routes:

#### `get_current_user`

Extracts and validates the JWT from the `Authorization: Bearer` header. Returns the `User` object or raises 401.

```python
from app.modules.auth.dependencies import get_current_active_user

@router.get("/protected")
async def protected_endpoint(
    current_user: User = Depends(get_current_active_user)
):
    return {"message": f"Hello, {current_user.username}"}
```

#### `get_current_active_user`

Same as `get_current_user` but also verifies the account is active (not deactivated). Raises 403 if inactive.

#### `require_role(role)`

Factory function that creates a dependency requiring a specific role:

```python
from app.modules.auth.dependencies import require_role
from app.modules.auth.models import UserRole

@router.delete("/admin-only")
async def admin_endpoint(
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    return {"message": "Admin access granted"}
```

#### `require_admin`

Convenience dependency that requires the `admin` role:

```python
from app.modules.auth.dependencies import require_admin

@router.post("/admin-action")
async def admin_action(current_user: User = Depends(require_admin)):
    ...
```

#### `get_optional_user`

Returns the user if authenticated, `None` otherwise. Useful for endpoints that work with or without authentication:

```python
from app.modules.auth.dependencies import get_optional_user

@router.get("/public-or-private")
async def mixed_endpoint(
    current_user: Optional[User] = Depends(get_optional_user)
):
    if current_user:
        return {"message": f"Hello, {current_user.username}"}
    return {"message": "Hello, anonymous"}
```

---

## Security Best Practices

### For Production Deployments

1. **Change the secret key**: Generate a secure random key.
   ```bash
   openssl rand -hex 32
   ```
   Set it as the `SECRET_KEY` environment variable. Never commit it to version control.

2. **Use HTTPS only**: Configure TLS termination at the reverse proxy level.

3. **Set strict CORS origins**: Never use `*` in production. List exact origins:
   ```
   CORS_ORIGINS=https://app.example.com,https://admin.example.com
   ```

4. **Token storage**: Store tokens in HTTP-only secure cookies when possible, or `localStorage` with XSS mitigations.

5. **Access token lifetime**: The default 15-minute lifetime is a good balance between security and usability. Do not increase beyond 30 minutes.

6. **Refresh token rotation**: The system already implements single-use refresh tokens. Do not disable this.

7. **Monitor security events**: Review `logs/security.log` regularly. Set up alerts for:
   - Multiple failed login attempts from the same IP.
   - Rate limit violations.
   - Permission denied events.

8. **Run token cleanup**: Schedule the `/api/auth/cleanup-tokens` endpoint daily to prevent token accumulation.

### Password Policy

The API enforces the following password rules:

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- Maximum 100 characters

---

## Rate Limiting on Auth Endpoints

Authentication endpoints have the strictest rate limits to prevent brute-force attacks:

| Endpoint                | Rate Limit     | Reason                         |
|-------------------------|----------------|--------------------------------|
| `POST /auth/register`   | 5 req/min      | Prevent mass account creation  |
| `POST /auth/login`      | 5 req/min      | Prevent brute-force attacks    |
| `POST /auth/refresh`    | 20 req/min     | Standard write limit           |
| `POST /auth/logout`     | 20 req/min     | Standard write limit           |
| `GET /auth/me`          | 20 req/min     | Standard write limit           |
| `POST /auth/cleanup-tokens` | 20 req/min | Admin maintenance             |

When a rate limit is exceeded, the API returns:

```
HTTP 429 Too Many Requests
```

```json
{
  "error": "Rate limit exceeded: 5 per 1 minute"
}
```

**Response headers** include rate limit metadata:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 45
```

---

## Security Event Logging

The system logs security events to `logs/security.log` in JSON format:

### Logged Events

| Event Type           | Trigger                                     |
|----------------------|---------------------------------------------|
| `failed_login`       | Invalid username or password                |
| `rate_limit_hit`     | Client exceeded rate limit                   |
| `unauthorized_access`| Missing or invalid token                     |
| `token_expired`      | Expired JWT presented                        |
| `token_invalid`      | Malformed JWT presented                      |
| `permission_denied`  | User lacks required role                     |
| `brute_force_detected`| Multiple failed attempts detected           |

### Log Entry Format

```json
{
  "event_type": "failed_login",
  "user": "john_doe",
  "ip": "192.168.1.100",
  "endpoint": "/api/auth/login",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-02-05T10:00:00+00:00",
  "details": {
    "reason": "invalid_credentials"
  }
}
```

### Log File Configuration

- **Path**: `logs/security.log`
- **Rotation**: 10 MB per file
- **Retention**: 90 days
- **Compression**: ZIP (for rotated files)

---

## Troubleshooting

### Common Issues

**"Could not validate credentials" (401)**

- Verify the token is included in the `Authorization` header.
- Verify the format is `Bearer <token>` (note the space).
- Check that the token has not expired (default: 15 minutes).
- Verify the token is an access token, not a refresh token.

**"Token has expired" (401)**

- Refresh the access token using `POST /api/auth/refresh`.
- If the refresh token is also expired, the user must log in again.

**"User account is inactive" (403)**

- The admin has deactivated this account. Contact an administrator.

**"Admin access required" (403)**

- The endpoint requires the `admin` role. Regular users cannot access it.

**"Rate limit exceeded: 5 per 1 minute" (429)**

- Wait for the rate limit window to reset (check `X-RateLimit-Reset` header).
- Auth endpoints are limited to 5 requests per minute per IP.

**"Username already registered" (400)**

- Choose a different username.

**"Email already registered" (400)**

- Use a different email address, or recover the existing account.

### Database Collections

The auth system uses two MongoDB collections:

| Collection       | Description                                |
|------------------|--------------------------------------------|
| `users`          | User accounts (username, email, password)  |
| `refresh_tokens` | Stored (hashed) refresh tokens             |

### Indexes

The auth repository creates the following indexes on startup:

- `users.username`: Unique index for fast lookup.
- `users.email`: Unique index for fast lookup.
- `refresh_tokens.token`: Index for token lookup during refresh.
- `refresh_tokens.user_id`: Index for revoking all user tokens on logout.
- `refresh_tokens.expires_at`: TTL index for automatic cleanup.
