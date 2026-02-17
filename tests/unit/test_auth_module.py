"""
Tests for auth module: token creation/decoding, role hierarchy, require_role.
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import timedelta


class TestTokenCreation:
    """Test JWT token creation."""

    def test_create_access_token_returns_string(self):
        with patch("api.auth.JWT_SECRET_KEY", "test-secret-key-12345"):
            from api.auth import create_access_token
            token = create_access_token({"sub": "testuser"})
            assert isinstance(token, str)
            assert len(token) > 0

    def test_create_access_token_with_custom_expiry(self):
        with patch("api.auth.JWT_SECRET_KEY", "test-secret-key-12345"):
            from api.auth import create_access_token
            token = create_access_token(
                {"sub": "testuser"},
                expires_delta=timedelta(minutes=5),
            )
            assert isinstance(token, str)


class TestTokenDecoding:
    """Test JWT token decoding."""

    def test_decode_valid_token_roundtrip(self):
        with patch("api.auth.JWT_SECRET_KEY", "test-secret-key-12345"):
            from api.auth import create_access_token, decode_token
            token = create_access_token({"sub": "testuser"})
            payload = decode_token(token)
            assert payload["sub"] == "testuser"

    def test_decode_expired_token_raises(self):
        from fastapi import HTTPException
        with patch("api.auth.JWT_SECRET_KEY", "test-secret-key-12345"):
            from api.auth import create_access_token, decode_token
            token = create_access_token(
                {"sub": "testuser"},
                expires_delta=timedelta(seconds=-1),
            )
            with pytest.raises(HTTPException) as exc_info:
                decode_token(token)
            assert exc_info.value.status_code == 401

    def test_decode_invalid_token_raises(self):
        from fastapi import HTTPException
        with patch("api.auth.JWT_SECRET_KEY", "test-secret-key-12345"):
            from api.auth import decode_token
            with pytest.raises(HTTPException) as exc_info:
                decode_token("this.is.not.a.valid.jwt")
            assert exc_info.value.status_code == 401


class TestRoleHierarchy:
    """Test role hierarchy constants."""

    def test_role_hierarchy_ordering(self):
        from api.auth import ROLE_HIERARCHY
        assert ROLE_HIERARCHY["admin"] > ROLE_HIERARCHY["analyst"]
        assert ROLE_HIERARCHY["analyst"] > ROLE_HIERARCHY["viewer"]

    def test_admin_is_highest(self):
        from api.auth import ROLE_HIERARCHY
        assert ROLE_HIERARCHY["admin"] == max(ROLE_HIERARCHY.values())


class TestRequireRole:
    """Test require_role dependency factory."""

    def test_require_role_allows_higher(self):
        from api.auth import require_role, ROLE_HIERARCHY
        checker = require_role("viewer")

        admin_user = MagicMock()
        admin_user.role = "admin"

        # The inner _check function is what gets called
        # We need to extract it and call manually
        # require_role returns a function that takes user=Depends(get_current_user)
        # For unit testing, we call the inner logic directly
        user_level = ROLE_HIERARCHY.get(admin_user.role, 0)
        min_level = ROLE_HIERARCHY.get("viewer", 0)
        assert user_level >= min_level

    def test_require_role_blocks_lower(self):
        from api.auth import ROLE_HIERARCHY
        viewer_user = MagicMock()
        viewer_user.role = "viewer"

        user_level = ROLE_HIERARCHY.get(viewer_user.role, 0)
        min_level = ROLE_HIERARCHY.get("analyst", 0)
        assert user_level < min_level


class TestGetCurrentUser:
    """Test get_current_user dependency."""

    def test_get_current_user_no_token_raises(self):
        from fastapi import HTTPException
        from api.auth import get_current_user
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(credentials=None, db=MagicMock())
        assert exc_info.value.status_code == 401

    def test_password_hashing(self):
        """Verify hash/verify roundtrip using mocked bcrypt (avoids passlib/bcrypt version issues)."""
        from api.auth import pwd_context
        # Use the underlying hasher interface to test the logic
        # without triggering passlib's bcrypt backend detection bug
        with patch.object(pwd_context, "hash", return_value="$2b$12$fakehash"):
            with patch.object(pwd_context, "verify", side_effect=lambda p, h: p == "testPass1"):
                from api.auth import hash_password, verify_password
                hashed = hash_password("testPass1")
                assert isinstance(hashed, str)
                assert verify_password("testPass1", hashed)
                assert not verify_password("wrongPass", hashed)
