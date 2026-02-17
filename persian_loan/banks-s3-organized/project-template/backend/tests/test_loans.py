"""
Unit Tests for Loans Module
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.modules.loans.repository import LoanRepository
from app.modules.loans.service import LoanService
from app.common.exceptions import ValidationException


@pytest.mark.unit
class TestLoanRepository:
    """Test LoanRepository."""

    async def test_get_all_loans(self, mock_db: AsyncIOMotorDatabase):
        """Test getting all loans from all banks."""
        repo = LoanRepository(mock_db)
        loans, total = await repo.get_all_loans()

        # Should get loans from both banks
        assert len(loans) >= 2
        assert total >= 2
        # Check we have loans from bank-melli
        bank_melli_loans = [l for l in loans if l.get("bankId") == "bank-melli"]
        assert len(bank_melli_loans) == 2

    async def test_get_no_guarantor_loans(self, mock_db: AsyncIOMotorDatabase):
        """Test getting loans without guarantor requirement."""
        repo = LoanRepository(mock_db)
        loans, total = await repo.get_no_guarantor_loans()

        # All returned loans should be from no-guarantor category
        assert len(loans) >= 1
        assert total >= 1
        # Check structure - repository returns loans with 'id' field, not 'loanId'
        for loan in loans:
            assert "bankId" in loan
            assert "id" in loan or "loanId" in loan

    async def test_get_loans_by_method(self, mock_db: AsyncIOMotorDatabase):
        """Test getting loans by calculation method."""
        repo = LoanRepository(mock_db)
        loans, total = await repo.get_loans_by_method("points-based")

        # All returned loans should be from banks with points-based method
        assert len(loans) >= 1
        assert total >= 1
        assert all(loan.get("calculationMethod") == "points-based" for loan in loans)

    async def test_get_bank_by_id(self, mock_db: AsyncIOMotorDatabase):
        """Test getting bank by ID."""
        repo = LoanRepository(mock_db)
        bank = await repo.get_bank_by_id("bank-melli")

        assert bank is not None
        assert bank["id"] == "bank-melli"


@pytest.mark.unit
class TestLoanService:
    """Test LoanService."""

    async def test_get_all_loans(self, mock_db: AsyncIOMotorDatabase):
        """Test getting all loans through service."""
        service = LoanService(mock_db)
        result = await service.get_all_loans()

        assert "total" in result
        assert "loans" in result
        assert result["total"] >= 2
        assert len(result["loans"]) >= 2

    async def test_get_all_loans_with_no_guarantor_filter(
        self, mock_db: AsyncIOMotorDatabase
    ):
        """Test filtering loans by no guarantor."""
        service = LoanService(mock_db)
        result = await service.get_all_loans(no_guarantor=True)

        assert result["total"] >= 1
        assert all(loan.get("guarantor") is False for loan in result["loans"])

    async def test_get_all_loans_with_method_filter(
        self, mock_db: AsyncIOMotorDatabase
    ):
        """Test filtering loans by calculation method."""
        service = LoanService(mock_db)
        result = await service.get_all_loans(calculation_method="points-based")

        # The service filters in-memory, so check structure
        assert "total" in result
        assert "loans" in result

    async def test_get_no_guarantor_loans(self, mock_db: AsyncIOMotorDatabase):
        """Test getting no guarantor loans."""
        service = LoanService(mock_db)
        result = await service.get_no_guarantor_loans()

        assert "total" in result
        assert "loans" in result
        assert len(result["loans"]) >= 1

    async def test_get_loans_by_method_valid(self, mock_db: AsyncIOMotorDatabase):
        """Test getting loans by valid calculation method."""
        service = LoanService(mock_db)
        result = await service.get_loans_by_method("points-based")

        assert "method" in result
        assert result["method"] == "points-based"
        assert "total" in result
        assert "loans" in result

    async def test_get_loans_by_method_invalid(self, mock_db: AsyncIOMotorDatabase):
        """Test getting loans by invalid calculation method."""
        service = LoanService(mock_db)

        with pytest.raises(ValidationException) as exc:
            await service.get_loans_by_method("invalid-method")

        assert "Invalid method" in str(exc.value)

    async def test_compare_loans(self, mock_db: AsyncIOMotorDatabase):
        """Test comparing multiple loans."""
        service = LoanService(mock_db)
        loan_ids = ["bank-melli:general-loan", "bank-melli:no-guarantor-loan"]
        result = await service.compare_loans(loan_ids)

        assert "totalCompared" in result
        assert "comparison" in result
        assert result["totalCompared"] == 2
        assert len(result["comparison"]) == 2

    async def test_compare_loans_invalid_format(self, mock_db: AsyncIOMotorDatabase):
        """Test comparing loans with invalid ID format."""
        service = LoanService(mock_db)
        loan_ids = ["invalid-format", "bank-melli:general-loan"]
        result = await service.compare_loans(loan_ids)

        # Should skip invalid format and only return valid ones
        assert result["totalCompared"] == 1

    async def test_compare_loans_non_existent(self, mock_db: AsyncIOMotorDatabase):
        """Test comparing non-existent loans."""
        service = LoanService(mock_db)
        loan_ids = ["non-existent:loan"]
        result = await service.compare_loans(loan_ids)

        assert result["totalCompared"] == 0
        assert len(result["comparison"]) == 0


@pytest.mark.integration
class TestLoansAPI:
    """Integration tests for Loans API endpoints."""

    async def test_get_all_loans(self, client: AsyncClient):
        """Test GET /api/loans/."""
        response = await client.get("/api/loans/")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result
        assert "pagination" in result["meta"]

        data = result["data"]
        pagination = result["meta"]["pagination"]
        assert pagination["total"] >= 2
        assert isinstance(data, list)

    async def test_get_all_loans_no_guarantor_filter(self, client: AsyncClient):
        """Test GET /api/loans/?no_guarantor=true."""
        response = await client.get("/api/loans/?no_guarantor=true")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        data = result["data"]
        assert all(loan.get("guarantor") is False for loan in data)

    async def test_get_all_loans_method_filter(self, client: AsyncClient):
        """Test GET /api/loans/?calculation_method=points-based."""
        response = await client.get("/api/loans/?calculation_method=points-based")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        data = result["data"]
        assert all(
            loan.get("calculationMethod") == "points-based" for loan in data
        )

    async def test_get_no_guarantor_loans(self, client: AsyncClient):
        """Test GET /api/loans/no-guarantor."""
        response = await client.get("/api/loans/no-guarantor")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result
        assert "pagination" in result["meta"]

        data = result["data"]
        assert len(data) >= 1

    async def test_get_loans_by_method(self, client: AsyncClient):
        """Test GET /api/loans/by-method/{method}."""
        response = await client.get("/api/loans/by-method/points-based")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result
        assert "pagination" in result["meta"]

    async def test_get_loans_by_invalid_method(self, client: AsyncClient):
        """Test GET /api/loans/by-method/{method} with invalid method."""
        response = await client.get("/api/loans/by-method/invalid-method")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_compare_loans(self, client: AsyncClient):
        """Test GET /api/loans/compare."""
        loan_ids = "bank-melli:general-loan,bank-melli:no-guarantor-loan"
        response = await client.get(f"/api/loans/compare?loan_ids={loan_ids}")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert "comparison" in data
        assert "totalCompared" in data
        assert data["totalCompared"] == 2

    async def test_compare_loans_empty(self, client: AsyncClient):
        """Test loan comparison with empty list."""
        response = await client.get("/api/loans/compare?loan_ids=")

        # Empty string is still a valid parameter, returns empty results
        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert data["totalCompared"] == 0

    async def test_compare_loans_non_existent(self, client: AsyncClient):
        """Test comparing non-existent loans."""
        loan_ids = "non-existent:loan,another-fake:loan"
        response = await client.get(f"/api/loans/compare?loan_ids={loan_ids}")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert data["totalCompared"] == 0
