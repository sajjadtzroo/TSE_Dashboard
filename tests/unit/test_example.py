"""
Example unit tests to verify pytest setup.
"""
import pytest


def test_basic_math():
    """Basic test to verify pytest works."""
    assert 1 + 1 == 2


def test_string_operations():
    """Test string operations."""
    assert "hello".upper() == "HELLO"
    assert "WORLD".lower() == "world"


@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (2, 4),
    (3, 6),
    (4, 8),
])
def test_double(input, expected):
    """Test parametrized tests work."""
    assert input * 2 == expected


def test_fixture_usage(today):
    """Test that fixtures work."""
    from datetime import date
    assert isinstance(today, date)
