"""
Security Event Logger

Provides structured JSON logging for security-relevant events:
- Failed login attempts
- Rate limit violations
- Unauthorized access attempts
- Suspicious activity

Each log entry includes:
- event_type: Categorical identifier (e.g. "failed_login", "rate_limit_hit")
- user: Username or "anonymous"
- ip: Client IP address
- endpoint: The request path
- correlation_id: Request correlation ID for tracing
- timestamp: ISO-8601 formatted time
- details: Event-specific metadata

Output is written to a dedicated security log file (logs/security.log) in
JSON format for easy ingestion by log aggregation systems (ELK, Datadog, etc.).
"""

import json
import sys
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional

from loguru import logger

from app.core.logger import get_logger

_app_logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Event types
# ---------------------------------------------------------------------------


class SecurityEvent(str, Enum):
    """Enumeration of security event types."""

    FAILED_LOGIN = "failed_login"
    RATE_LIMIT_HIT = "rate_limit_hit"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    TOKEN_EXPIRED = "token_expired"
    TOKEN_INVALID = "token_invalid"
    ACCOUNT_LOCKED = "account_locked"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    PERMISSION_DENIED = "permission_denied"
    BRUTE_FORCE_DETECTED = "brute_force_detected"


# ---------------------------------------------------------------------------
# Security Logger
# ---------------------------------------------------------------------------


class SecurityLogger:
    """Structured security event logger.

    Writes JSON-formatted security events to both the application logger
    and a dedicated security log file.
    """

    def __init__(self) -> None:
        self._logger = logger.bind(security=True)
        self._setup_security_log()

    def _setup_security_log(self) -> None:
        """Configure dedicated security log file with JSON output."""
        log_path = Path("logs")
        log_path.mkdir(exist_ok=True)

        # JSON format for machine parsing
        logger.add(
            log_path / "security.log",
            format="{message}",
            level="WARNING",
            rotation="10 MB",
            retention="90 days",
            compression="zip",
            filter=lambda record: record["extra"].get("security", False),
            serialize=False,  # We handle our own JSON serialization
        )

    def _build_event(
        self,
        event_type: SecurityEvent,
        *,
        user: str = "anonymous",
        ip: str = "unknown",
        endpoint: str = "",
        correlation_id: str = "",
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Build a structured security event dictionary."""
        return {
            "event_type": event_type.value,
            "user": user,
            "ip": ip,
            "endpoint": endpoint,
            "correlation_id": correlation_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {},
        }

    def log_event(
        self,
        event_type: SecurityEvent,
        *,
        user: str = "anonymous",
        ip: str = "unknown",
        endpoint: str = "",
        correlation_id: str = "",
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Log a security event.

        Args:
            event_type: The type of security event.
            user: The username associated with the event.
            ip: Client IP address.
            endpoint: The API endpoint path.
            correlation_id: Request correlation ID.
            details: Additional event-specific metadata.

        Returns:
            The event dictionary that was logged.
        """
        event = self._build_event(
            event_type,
            user=user,
            ip=ip,
            endpoint=endpoint,
            correlation_id=correlation_id,
            details=details,
        )

        # Write as JSON to the security log
        self._logger.warning(json.dumps(event, ensure_ascii=False))

        return event

    # ------------------------------------------------------------------
    # Convenience methods
    # ------------------------------------------------------------------

    def failed_login(
        self,
        *,
        user: str,
        ip: str,
        endpoint: str = "/api/auth/login",
        correlation_id: str = "",
        reason: str = "invalid_credentials",
    ) -> Dict[str, Any]:
        """Log a failed login attempt."""
        return self.log_event(
            SecurityEvent.FAILED_LOGIN,
            user=user,
            ip=ip,
            endpoint=endpoint,
            correlation_id=correlation_id,
            details={"reason": reason},
        )

    def rate_limit_hit(
        self,
        *,
        ip: str,
        endpoint: str,
        correlation_id: str = "",
        limit: str = "",
    ) -> Dict[str, Any]:
        """Log a rate limit violation."""
        return self.log_event(
            SecurityEvent.RATE_LIMIT_HIT,
            ip=ip,
            endpoint=endpoint,
            correlation_id=correlation_id,
            details={"limit": limit},
        )

    def unauthorized_access(
        self,
        *,
        ip: str,
        endpoint: str,
        correlation_id: str = "",
        user: str = "anonymous",
        reason: str = "missing_token",
    ) -> Dict[str, Any]:
        """Log an unauthorized access attempt."""
        return self.log_event(
            SecurityEvent.UNAUTHORIZED_ACCESS,
            user=user,
            ip=ip,
            endpoint=endpoint,
            correlation_id=correlation_id,
            details={"reason": reason},
        )

    def permission_denied(
        self,
        *,
        user: str,
        ip: str,
        endpoint: str,
        correlation_id: str = "",
        required_role: str = "",
    ) -> Dict[str, Any]:
        """Log a permission denied event."""
        return self.log_event(
            SecurityEvent.PERMISSION_DENIED,
            user=user,
            ip=ip,
            endpoint=endpoint,
            correlation_id=correlation_id,
            details={"required_role": required_role},
        )


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------

security_logger = SecurityLogger()
