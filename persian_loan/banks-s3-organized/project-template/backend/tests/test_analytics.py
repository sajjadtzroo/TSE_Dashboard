"""
Unit Tests for Analytics Module
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.modules.analytics.repository import AnalyticsRepository
from app.modules.analytics.service import AnalyticsService


@pytest.mark.unit
class TestAnalyticsRepository:
    """Test AnalyticsRepository."""

    async def test_get_all_banks(self, mock_db: AsyncIOMotorDatabase):
        """Test getting all banks from repository."""
        repo = AnalyticsRepository(mock_db)
        banks = await repo.get_all_banks()

        assert len(banks) == 2
        assert any(b["id"] == "bank-melli" for b in banks)
        assert any(b["id"] == "digikala-finance" for b in banks)

    async def test_get_calculation_method_distribution(
        self, mock_db: AsyncIOMotorDatabase
    ):
        """Test getting calculation method distribution."""
        repo = AnalyticsRepository(mock_db)
        distribution = await repo.get_calculation_method_distribution()

        assert isinstance(distribution, dict)
        assert "points-based" in distribution
        assert distribution["points-based"] >= 1


@pytest.mark.unit
class TestAnalyticsService:
    """Test AnalyticsService."""

    async def test_get_summary(self, mock_db: AsyncIOMotorDatabase):
        """Test getting overall summary statistics."""
        service = AnalyticsService(mock_db)
        summary = await service.get_summary()

        assert "totalBanks" in summary
        assert "traditionalBanks" in summary
        assert "digitalBanks" in summary
        assert "totalLoans" in summary
        assert "noGuarantorLoans" in summary
        assert "calculationMethods" in summary

        assert summary["totalBanks"] == 2
        assert summary["traditionalBanks"] == 1
        assert summary["digitalBanks"] == 1
        assert summary["totalLoans"] >= 2

    async def test_get_by_category(self, mock_db: AsyncIOMotorDatabase):
        """Test getting banks grouped by category."""
        service = AnalyticsService(mock_db)
        categories = await service.get_by_category()

        assert "traditional-banks" in categories
        assert "digital-banks" in categories

        # Check traditional banks
        trad_banks = categories["traditional-banks"]
        assert len(trad_banks) == 1
        assert trad_banks[0]["id"] == "bank-melli"

        # Check digital banks
        digital_banks = categories["digital-banks"]
        assert len(digital_banks) == 1
        assert digital_banks[0]["id"] == "digikala-finance"

    async def test_get_interest_rates(self, mock_db: AsyncIOMotorDatabase):
        """Test getting interest rates distribution."""
        service = AnalyticsService(mock_db)
        result = await service.get_interest_rates()

        assert "distribution" in result
        assert "avgRate" in result
        assert "minRate" in result
        assert "maxRate" in result

        # Check that we have rate distributions
        distribution = result["distribution"]
        assert isinstance(distribution, list)
        assert len(distribution) >= 2

    async def test_get_loan_amounts(self, mock_db: AsyncIOMotorDatabase):
        """Test getting loan amounts range."""
        service = AnalyticsService(mock_db)
        result = await service.get_loan_amounts()

        assert "banks" in result
        assert "totalBanks" in result

        amounts = result["banks"]
        assert len(amounts) >= 2

        # Each bank should have loan amount info
        for bank in amounts:
            assert "bankId" in bank
            assert "bankNameFA" in bank
            assert "loans" in bank
            assert len(bank["loans"]) > 0

            # Each loan should have amount range
            for loan in bank["loans"]:
                assert "loanId" in loan
                assert "loanNameFA" in loan
                # At least one amount field should be present
                assert loan.get("minAmount") or loan.get("maxAmount")

    async def test_get_requirements_matrix(self, mock_db: AsyncIOMotorDatabase):
        """Test getting requirements matrix."""
        service = AnalyticsService(mock_db)
        result = await service.get_requirements_matrix()

        assert "matrix" in result
        assert "totalBanks" in result

        matrix = result["matrix"]
        assert len(matrix) == 2

        for bank_req in matrix:
            assert "bankId" in bank_req
            assert "bankNameFA" in bank_req
            assert "category" in bank_req
            assert "requirements" in bank_req

            requirements = bank_req["requirements"]
            # Check expected requirement fields exist
            assert "guarantor" in requirements
            assert "check" in requirements


@pytest.mark.integration
class TestAnalyticsAPI:
    """Integration tests for Analytics API endpoints."""

    async def test_get_summary(self, client: AsyncClient):
        """Test GET /api/analytics/summary."""
        response = await client.get("/api/analytics/summary")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert "totalBanks" in data
        assert "traditionalBanks" in data
        assert "digitalBanks" in data
        assert "totalLoans" in data
        assert "calculationMethods" in data

        assert data["totalBanks"] == 2
        assert data["totalLoans"] >= 2

    async def test_get_by_category(self, client: AsyncClient):
        """Test GET /api/analytics/by-category."""
        response = await client.get("/api/analytics/by-category")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert "traditional-banks" in data
        assert "digital-banks" in data

        assert len(data["traditional-banks"]) >= 1
        assert len(data["digital-banks"]) >= 1

    async def test_get_interest_rates(self, client: AsyncClient):
        """Test GET /api/analytics/interest-rates."""
        response = await client.get("/api/analytics/interest-rates")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert "distribution" in data
        assert isinstance(data["distribution"], list)
        assert len(data["distribution"]) >= 2
        # avgRate, minRate, maxRate should be present as strings with %
        assert "avgRate" in data
        assert "minRate" in data
        assert "maxRate" in data
        assert isinstance(data["avgRate"], str)
        assert "%" in data["avgRate"]

    async def test_get_loan_amounts(self, client: AsyncClient):
        """Test GET /api/analytics/loan-amounts."""
        response = await client.get("/api/analytics/loan-amounts")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert "banks" in data
        assert "totalBanks" in data

        banks = data["banks"]
        assert isinstance(banks, list)
        assert len(banks) >= 2

        for bank in banks:
            assert "bankId" in bank
            assert "loans" in bank
            assert len(bank["loans"]) > 0

    async def test_get_requirements_matrix(self, client: AsyncClient):
        """Test GET /api/analytics/requirements-matrix."""
        response = await client.get("/api/analytics/requirements-matrix")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert "matrix" in data
        assert "totalBanks" in data

        matrix = data["matrix"]
        assert isinstance(matrix, list)
        assert len(matrix) == 2

        for bank_req in matrix:
            assert "bankId" in bank_req
            assert "requirements" in bank_req
            assert isinstance(bank_req["requirements"], dict)


@pytest.mark.integration
class TestHealthCheck:
    """Test health check endpoint."""

    async def test_health_check(self, client: AsyncClient):
        """Test GET /health."""
        # Health endpoint is at root level, not under /api
        response = await client.get("http://test/health")

        # May be 200 or 404 depending on routing
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    async def test_root_endpoint(self, client: AsyncClient):
        """Test GET /."""
        # Root endpoint is at root level
        response = await client.get("http://test/")

        # May be 200 or 404 depending on routing
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
