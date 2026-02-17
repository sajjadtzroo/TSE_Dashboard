"""
Unit Tests for Banks Module
"""

import pytest
from fastapi import status
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.modules.banks.repository import BankRepository
from app.modules.banks.service import BankService
from app.modules.banks.schemas import BankCreate
from app.common.exceptions import NotFoundException, ValidationException


@pytest.mark.unit
class TestBankRepository:
    """Test BankRepository."""

    async def test_get_all_banks(self, mock_db: AsyncIOMotorDatabase):
        """Test getting all banks."""
        repo = BankRepository(mock_db)
        banks = await repo.get_all()

        assert len(banks) == 2
        assert banks[0]["id"] == "bank-melli"
        assert banks[1]["id"] == "digikala-finance"

    async def test_get_all_banks_with_category_filter(
        self, mock_db: AsyncIOMotorDatabase
    ):
        """Test getting banks filtered by category."""
        repo = BankRepository(mock_db)
        banks = await repo.get_all(category="traditional-banks")

        assert len(banks) == 1
        assert banks[0]["id"] == "bank-melli"
        assert banks[0]["category"] == "traditional-banks"

    async def test_get_all_banks_with_type_filter(self, mock_db: AsyncIOMotorDatabase):
        """Test getting banks filtered by type."""
        repo = BankRepository(mock_db)
        banks = await repo.get_all(bank_type="neobank")

        assert len(banks) == 1
        assert banks[0]["id"] == "digikala-finance"
        assert banks[0]["type"] == "neobank"

    async def test_get_bank_by_id(self, mock_db: AsyncIOMotorDatabase):
        """Test getting a bank by ID."""
        repo = BankRepository(mock_db)
        bank = await repo.get_by_id("bank-melli")

        assert bank is not None
        assert bank["id"] == "bank-melli"
        assert bank["nameFA"] == "بانک ملی"
        assert bank["loansCount"] == 2

    async def test_get_bank_by_id_not_found(self, mock_db: AsyncIOMotorDatabase):
        """Test getting a non-existent bank."""
        repo = BankRepository(mock_db)
        bank = await repo.get_by_id("non-existent")

        assert bank is None

    async def test_bank_exists(self, mock_db: AsyncIOMotorDatabase):
        """Test checking if bank exists."""
        repo = BankRepository(mock_db)

        assert await repo.exists_by_id("bank-melli") is True
        assert await repo.exists_by_id("non-existent") is False

    async def test_create_bank(self, mock_db: AsyncIOMotorDatabase, sample_bank):
        """Test creating a new bank."""
        repo = BankRepository(mock_db)
        await repo.create(sample_bank)

        # Verify bank was created
        bank = await repo.get_by_id("test-bank")
        assert bank is not None
        assert bank["nameFA"] == "بانک تست"

    async def test_delete_bank(self, mock_db: AsyncIOMotorDatabase):
        """Test deleting a bank."""
        repo = BankRepository(mock_db)
        await repo.delete("bank-melli")

        # Verify bank was deleted
        bank = await repo.get_by_id("bank-melli")
        assert bank is None


@pytest.mark.unit
class TestBankService:
    """Test BankService."""

    async def test_get_all_banks(self, mock_db: AsyncIOMotorDatabase):
        """Test getting all banks through service."""
        service = BankService(mock_db)
        banks = await service.get_all_banks()

        assert len(banks) == 2
        assert banks[0].id == "bank-melli"
        assert banks[0].name_fa == "بانک ملی"

    async def test_get_traditional_banks(self, mock_db: AsyncIOMotorDatabase):
        """Test getting traditional banks."""
        service = BankService(mock_db)
        banks = await service.get_traditional_banks()

        assert len(banks) == 1
        assert banks[0].category == "traditional-banks"

    async def test_get_digital_banks(self, mock_db: AsyncIOMotorDatabase):
        """Test getting digital banks."""
        service = BankService(mock_db)
        banks = await service.get_digital_banks()

        assert len(banks) == 1
        assert banks[0].category == "digital-banks"

    async def test_get_bank_by_id(self, mock_db: AsyncIOMotorDatabase):
        """Test getting bank by ID through service."""
        service = BankService(mock_db)
        bank = await service.get_bank_by_id("bank-melli")

        assert bank["id"] == "bank-melli"
        assert bank["nameFA"] == "بانک ملی"

    async def test_get_bank_by_id_not_found(self, mock_db: AsyncIOMotorDatabase):
        """Test getting non-existent bank raises exception."""
        service = BankService(mock_db)

        with pytest.raises(NotFoundException) as exc:
            await service.get_bank_by_id("non-existent")

        assert "Bank" in str(exc.value)

    async def test_get_bank_loans(self, mock_db: AsyncIOMotorDatabase):
        """Test getting loans for a bank."""
        service = BankService(mock_db)
        result = await service.get_bank_loans("bank-melli")

        assert result["bankId"] == "bank-melli"
        assert result["loansCount"] == 2
        assert len(result["loans"]) == 2

    async def test_create_bank_success(self, mock_db: AsyncIOMotorDatabase):
        """Test creating a new bank."""
        service = BankService(mock_db)
        bank_data = BankCreate(
            id="new-bank",
            nameFA="بانک جدید",
            nameEN="New Bank",
            category="traditional-banks",
        )

        result = await service.create_bank(bank_data)
        assert "created successfully" in result["message"]

        # Verify it was created
        bank = await service.get_bank_by_id("new-bank")
        assert bank["nameFA"] == "بانک جدید"

    async def test_create_bank_duplicate(self, mock_db: AsyncIOMotorDatabase):
        """Test creating duplicate bank raises exception."""
        service = BankService(mock_db)
        bank_data = BankCreate(
            id="bank-melli",
            nameFA="بانک ملی",
            nameEN="Bank Melli",
            category="traditional-banks",
        )

        with pytest.raises(ValidationException) as exc:
            await service.create_bank(bank_data)

        assert "already exists" in str(exc.value)

    async def test_delete_bank(self, mock_db: AsyncIOMotorDatabase):
        """Test deleting a bank."""
        service = BankService(mock_db)
        result = await service.delete_bank("digikala-finance")

        assert "deleted successfully" in result["message"]

        # Verify it was deleted
        with pytest.raises(NotFoundException):
            await service.get_bank_by_id("digikala-finance")


@pytest.mark.integration
class TestBanksAPI:
    """Integration tests for Banks API endpoints."""

    async def test_get_all_banks(self, client: AsyncClient):
        """Test GET /api/banks/."""
        response = await client.get("/api/banks/")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result
        assert "pagination" in result["meta"]

        data = result["data"]
        assert len(data) == 2
        assert data[0]["id"] == "bank-melli"

    async def test_get_banks_filtered_by_category(self, client: AsyncClient):
        """Test GET /api/banks/?category=traditional-banks."""
        response = await client.get("/api/banks/?category=traditional-banks")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        data = result["data"]
        assert len(data) == 1
        assert data[0]["category"] == "traditional-banks"

    async def test_get_banks_filtered_by_type(self, client: AsyncClient):
        """Test GET /api/banks/?type=neobank."""
        response = await client.get("/api/banks/?type=neobank")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        data = result["data"]
        assert len(data) == 1
        assert data[0]["type"] == "neobank"

    async def test_get_traditional_banks(self, client: AsyncClient):
        """Test GET /api/banks/traditional."""
        response = await client.get("/api/banks/traditional")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result
        assert "pagination" in result["meta"]

        data = result["data"]
        assert len(data) == 1
        assert all(bank["category"] == "traditional-banks" for bank in data)

    async def test_get_digital_banks(self, client: AsyncClient):
        """Test GET /api/banks/digital."""
        response = await client.get("/api/banks/digital")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result
        assert "pagination" in result["meta"]

        data = result["data"]
        assert len(data) == 1
        assert all(bank["category"] == "digital-banks" for bank in data)

    async def test_get_bank_by_id(self, client: AsyncClient):
        """Test GET /api/banks/{bank_id}."""
        response = await client.get("/api/banks/bank-melli")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert data["id"] == "bank-melli"
        assert data["nameFA"] == "بانک ملی"

    async def test_get_bank_by_id_not_found(self, client: AsyncClient):
        """Test GET /api/banks/{bank_id} with non-existent ID."""
        response = await client.get("/api/banks/non-existent")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    async def test_get_bank_loans(self, client: AsyncClient):
        """Test GET /api/banks/{bank_id}/loans."""
        response = await client.get("/api/banks/bank-melli/loans")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert data["bankId"] == "bank-melli"
        assert data["loansCount"] == 2
        assert len(data["loans"]) == 2

    async def test_create_bank(self, client: AsyncClient):
        """Test POST /api/banks/."""
        bank_data = {
            "id": "test-bank-2",
            "nameFA": "بانک تست ۲",
            "nameEN": "Test Bank 2",
            "category": "traditional-banks",
        }

        response = await client.post("/api/banks/", json=bank_data)

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert "created successfully" in data["message"]

    async def test_delete_bank(self, client: AsyncClient):
        """Test DELETE /api/banks/{bank_id}."""
        response = await client.delete("/api/banks/digikala-finance")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope
        assert result["success"] is True
        assert "data" in result
        assert "meta" in result

        data = result["data"]
        assert "deleted successfully" in data["message"]

    async def test_pagination(self, client: AsyncClient):
        """Test pagination parameters."""
        response = await client.get("/api/banks/?page=1&page_size=1")

        assert response.status_code == status.HTTP_200_OK
        result = response.json()

        # Verify ApiResponse envelope with pagination
        assert result["success"] is True
        assert "meta" in result
        assert "pagination" in result["meta"]

        pagination = result["meta"]["pagination"]
        assert pagination["page"] == 1
        assert pagination["page_size"] == 1
        assert pagination["total"] >= 1

        data = result["data"]
        assert len(data) == 1
