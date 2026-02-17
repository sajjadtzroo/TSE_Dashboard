"""
Authentication Router
API endpoints for user authentication.

Rate limits:
- /login, /register: 5 req/min (RATE_LIMIT_AUTH) to mitigate brute-force
- /refresh, /logout, /me: 20 req/min (RATE_LIMIT_WRITE)
- /cleanup-tokens: 20 req/min (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.middleware.rate_limit import (
    RATE_LIMIT_AUTH,
    RATE_LIMIT_WRITE,
    limiter,
)
from app.common.monitoring.security_logger import security_logger
from app.common.responses import ApiResponse
from app.core.database import database
from app.modules.auth.dependencies import get_current_active_user
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    Token,
    TokenRefresh,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=ApiResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account with username, email, and password.",
)
@limiter.limit(RATE_LIMIT_AUTH)
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(database.get_db),
) -> ApiResponse[UserResponse]:
    """
    Register a new user.

    - **username**: Unique username (3-50 characters, alphanumeric + underscore)
    - **email**: Valid email address
    - **password**: Strong password (min 8 chars, uppercase, lowercase, digit)
    - **role**: Optional role (defaults to 'user')
    """
    service = AuthService(db)
    user = await service.register(user_data)
    user_response = UserResponse(
        _id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )
    return ApiResponse.ok(data=user_response)


@router.post(
    "/login",
    response_model=ApiResponse[Token],
    summary="User login",
    description="Authenticate user and receive JWT access and refresh tokens.",
)
@limiter.limit(RATE_LIMIT_AUTH)
async def login(
    request: Request,
    login_data: UserLogin,
    db: AsyncIOMotorDatabase = Depends(database.get_db),
) -> ApiResponse[Token]:
    """
    Login and receive JWT tokens.

    - **username**: User's username
    - **password**: User's password

    Returns access token (15 min expiry) and refresh token (7 days expiry).
    """
    service = AuthService(db)
    try:
        token = await service.login(login_data)
        return ApiResponse.ok(data=token)
    except HTTPException:
        # Log failed login attempt for security monitoring
        correlation_id = getattr(request.state, "correlation_id", "")
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        security_logger.failed_login(
            user=login_data.username,
            ip=client_ip,
            correlation_id=correlation_id,
        )
        raise


@router.post(
    "/refresh",
    response_model=ApiResponse[Token],
    summary="Refresh access token",
    description="Get a new access token using a valid refresh token.",
)
@limiter.limit(RATE_LIMIT_WRITE)
async def refresh(
    request: Request,
    token_data: TokenRefresh,
    db: AsyncIOMotorDatabase = Depends(database.get_db),
) -> ApiResponse[Token]:
    """
    Refresh access token.

    - **refresh_token**: Valid refresh token

    Returns new access token and refresh token. Old refresh token is revoked.
    """
    service = AuthService(db)
    token = await service.refresh(token_data.refresh_token)
    return ApiResponse.ok(data=token)


@router.post(
    "/logout",
    response_model=ApiResponse[dict],
    summary="User logout",
    description="Logout user by revoking all refresh tokens.",
)
@limiter.limit(RATE_LIMIT_WRITE)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(database.get_db),
) -> ApiResponse[dict]:
    """
    Logout current user.

    Requires authentication. Revokes all refresh tokens for the user.
    """
    service = AuthService(db)
    await service.logout(current_user.id)
    return ApiResponse.ok(data={"message": "Logged out successfully"})


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
    summary="Get current user",
    description="Get the profile of the currently authenticated user.",
)
@limiter.limit(RATE_LIMIT_WRITE)
async def get_current_user_profile(
    request: Request,
    current_user: User = Depends(get_current_active_user),
) -> ApiResponse[UserResponse]:
    """
    Get current user profile.

    Requires authentication. Returns the authenticated user's profile.
    """
    user_response = UserResponse(
        _id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat(),
    )
    return ApiResponse.ok(data=user_response)


@router.post(
    "/cleanup-tokens",
    response_model=ApiResponse[dict],
    summary="Clean up expired tokens",
    description="Admin endpoint to clean up expired refresh tokens from database.",
)
@limiter.limit(RATE_LIMIT_WRITE)
async def cleanup_expired_tokens(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(database.get_db),
) -> ApiResponse[dict]:
    """
    Clean up expired refresh tokens.

    Admin-only endpoint. Removes expired tokens from database.
    """
    if current_user.role.value != "admin":
        # Log permission denied
        correlation_id = getattr(request.state, "correlation_id", "")
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        security_logger.permission_denied(
            user=current_user.username,
            ip=client_ip,
            endpoint="/api/auth/cleanup-tokens",
            correlation_id=correlation_id,
            required_role="admin",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    service = AuthService(db)
    count = await service.cleanup_expired_tokens()
    return ApiResponse.ok(data={"message": f"Deleted {count} expired tokens"})
