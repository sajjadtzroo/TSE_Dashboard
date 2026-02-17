"""
Banks Router
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.database import get_banks_collection
from app.models import BankResponse, BankSummary, BankCreate

router = APIRouter()


@router.get("/", response_model=List[BankSummary])
async def get_all_banks(
    category: Optional[str] = Query(None, description="Filter by category (traditional-banks, digital-banks)"),
    type: Optional[str] = Query(None, description="Filter by type (neobank, private, state-owned)")
):
    """Get all banks with optional filtering."""
    collection = get_banks_collection()

    query = {}
    if category:
        query["category"] = category
    if type:
        query["type"] = type

    cursor = collection.find(query)
    banks = await cursor.to_list(length=100)

    # Remove MongoDB _id to prevent conflict with custom id field
    for bank in banks:
        bank.pop("_id", None)

    return [
        BankSummary(
            id=bank["id"],
            nameFA=bank["nameFA"],
            nameEN=bank["nameEN"],
            category=bank["category"],
            type=bank.get("type"),
            loansCount=bank.get("loansCount", 0),
            calculationMethod=bank.get("calculationMethod")
        )
        for bank in banks
    ]


@router.get("/traditional", response_model=List[BankSummary])
async def get_traditional_banks():
    """Get all traditional banks."""
    collection = get_banks_collection()
    cursor = collection.find({"category": "traditional-banks"})
    banks = await cursor.to_list(length=50)

    # Remove MongoDB _id to prevent conflict with custom id field
    for bank in banks:
        bank.pop("_id", None)

    return [
        BankSummary(
            id=bank["id"],
            nameFA=bank["nameFA"],
            nameEN=bank["nameEN"],
            category=bank["category"],
            type=bank.get("type"),
            loansCount=bank.get("loansCount", 0)
        )
        for bank in banks
    ]


@router.get("/digital", response_model=List[BankSummary])
async def get_digital_banks():
    """Get all digital/neo banks."""
    collection = get_banks_collection()
    cursor = collection.find({"category": "digital-banks"})
    banks = await cursor.to_list(length=50)

    # Remove MongoDB _id to prevent conflict with custom id field
    for bank in banks:
        bank.pop("_id", None)

    return [
        BankSummary(
            id=bank["id"],
            nameFA=bank["nameFA"],
            nameEN=bank["nameEN"],
            category=bank["category"],
            type=bank.get("type"),
            loansCount=bank.get("loansCount", 0)
        )
        for bank in banks
    ]


@router.get("/{bank_id}")
async def get_bank_by_id(bank_id: str):
    """Get a specific bank by ID."""
    collection = get_banks_collection()
    bank = await collection.find_one({"id": bank_id})

    if not bank:
        raise HTTPException(status_code=404, detail=f"Bank {bank_id} not found")

    # Remove MongoDB _id field
    bank.pop("_id", None)
    return bank


@router.post("/", response_model=dict)
async def create_bank(bank: BankCreate):
    """Create a new bank."""
    collection = get_banks_collection()

    # Check if bank already exists
    existing = await collection.find_one({"id": bank.id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Bank {bank.id} already exists")

    bank_dict = bank.model_dump()
    await collection.insert_one(bank_dict)

    return {"message": f"Bank {bank.id} created successfully"}


@router.get("/{bank_id}/loans")
async def get_bank_loans(bank_id: str):
    """Get all loans for a specific bank."""
    collection = get_banks_collection()
    bank = await collection.find_one({"id": bank_id})

    if not bank:
        raise HTTPException(status_code=404, detail=f"Bank {bank_id} not found")

    return {
        "bankId": bank_id,
        "bankName": bank.get("nameFA"),
        "loans": bank.get("loanTypes", []),
        "loansCount": bank.get("loansCount", 0)
    }
