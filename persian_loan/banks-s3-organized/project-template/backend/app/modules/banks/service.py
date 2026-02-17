"""
Banks Service - Business Logic
"""

from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.exceptions import NotFoundException, ValidationException
from app.core.logger import get_logger
from app.modules.banks.repository import BankRepository
from app.modules.banks.schemas import BankCreate, BankResponse, BankSummary

logger = get_logger(__name__)


class BankService:
    """Service for bank business logic."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = BankRepository(db)

    async def get_all_banks(
        self,
        category: Optional[str] = None,
        bank_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[BankSummary]:
        """Get all banks."""
        banks = await self.repository.get_all(
            category=category,
            bank_type=bank_type,
            skip=skip,
            limit=limit,
        )

        return [
            BankSummary(
                id=bank["id"],
                nameFA=bank["nameFA"],
                nameEN=bank["nameEN"],
                category=bank["category"],
                type=bank.get("type"),
                loansCount=bank.get("loansCount", 0),
                calculationMethod=bank.get("calculationMethod"),
            )
            for bank in banks
        ]

    async def get_traditional_banks(self) -> List[BankSummary]:
        """Get all traditional banks."""
        return await self.get_all_banks(category="traditional-banks")

    async def get_digital_banks(self) -> List[BankSummary]:
        """Get all digital banks."""
        return await self.get_all_banks(category="digital-banks")

    async def get_bank_by_id(self, bank_id: str) -> BankResponse:
        """Get a bank by ID."""
        bank = await self.repository.get_by_id(bank_id)

        if not bank:
            raise NotFoundException("Bank", bank_id)

        return bank

    async def get_bank_loans(self, bank_id: str) -> dict:
        """Get loans for a specific bank."""
        bank = await self.repository.get_by_id(bank_id)

        if not bank:
            raise NotFoundException("Bank", bank_id)

        return {
            "bankId": bank_id,
            "bankNameFA": bank.get("nameFA"),
            "bankNameEN": bank.get("nameEN"),
            "loans": bank.get("loanTypes", []),
            "loansCount": bank.get("loansCount", 0),
        }

    async def create_bank(self, bank_data: BankCreate) -> dict:
        """Create a new bank."""
        # Check if bank already exists
        if await self.repository.exists_by_id(bank_data.id):
            raise ValidationException(f"Bank {bank_data.id} already exists")

        bank_dict = bank_data.model_dump(by_alias=True)
        await self.repository.create(bank_dict)

        logger.success(f"Bank created: {bank_data.id}")

        return {"message": f"Bank {bank_data.id} created successfully"}

    async def update_bank(self, bank_id: str, bank_data: dict) -> dict:
        """Update a bank."""
        if not await self.repository.exists_by_id(bank_id):
            raise NotFoundException("Bank", bank_id)

        await self.repository.update(bank_id, bank_data)

        return {"message": f"Bank {bank_id} updated successfully"}

    async def delete_bank(self, bank_id: str) -> dict:
        """Delete a bank."""
        if not await self.repository.exists_by_id(bank_id):
            raise NotFoundException("Bank", bank_id)

        await self.repository.delete(bank_id)

        return {"message": f"Bank {bank_id} deleted successfully"}
