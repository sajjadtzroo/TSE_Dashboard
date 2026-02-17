"""
Payment Reminders Router

API endpoints for loan management and payment alerts.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, Path, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.responses import ApiResponse
from app.core.database import get_db
from app.modules.reminders.schemas import (
    AlertsListResponse,
    LoanListResponse,
    PaymentCalculationRequest,
    PaymentCalculationResponse,
    UserLoanCreate,
    UserLoanResponse,
    UserLoanUpdate,
    UserLoanWithSchedule,
)
from app.modules.reminders.service import RemindersService

router = APIRouter()


def get_reminders_service(
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> RemindersService:
    """Dependency to get reminders service."""
    return RemindersService(db)


# Loan endpoints

@router.post("/loans", response_model=ApiResponse[UserLoanWithSchedule], status_code=201)
async def create_loan(
    loan_data: UserLoanCreate,
    service: RemindersService = Depends(get_reminders_service)
) -> ApiResponse[UserLoanWithSchedule]:
    """
    Create a new user loan with payment schedule.

    This endpoint:
    - Validates loan parameters
    - Calculates monthly payment using precise decimal arithmetic
    - Generates complete payment schedule
    - Stores loan and schedule in database
    """
    loan = await service.create_loan(loan_data)
    return ApiResponse.ok(data=loan)


@router.get("/loans", response_model=ApiResponse[LoanListResponse])
async def get_user_loans(
    user_id: str = Query(..., alias="userId", description="User ID"),
    active_only: bool = Query(True, alias="activeOnly", description="Return only active loans"),
    service: RemindersService = Depends(get_reminders_service)
) -> ApiResponse[LoanListResponse]:
    """
    Get all loans for a user.

    Returns loan list with summary statistics.
    """
    loans = await service.get_user_loans(user_id, active_only)
    return ApiResponse.ok(data=loans)


@router.get("/loans/{loan_id}", response_model=ApiResponse[UserLoanWithSchedule])
async def get_loan(
    loan_id: str = Path(..., description="Loan ID"),
    include_schedule: bool = Query(True, alias="includeSchedule", description="Include payment schedule"),
    service: RemindersService = Depends(get_reminders_service)
) -> ApiResponse[UserLoanWithSchedule]:
    """
    Get a specific loan by ID.

    Optionally includes complete payment schedule.
    """
    loan = await service.get_loan(loan_id, include_schedule)
    return ApiResponse.ok(data=loan)


@router.put("/loans/{loan_id}", response_model=ApiResponse[UserLoanResponse])
async def update_loan(
    loan_id: str,
    update_data: UserLoanUpdate,
    service: RemindersService = Depends(get_reminders_service)
) -> ApiResponse[UserLoanResponse]:
    """
    Update a loan.

    If financial parameters are changed (principal, rate, term),
    the payment schedule is automatically recalculated.
    """
    loan = await service.update_loan(loan_id, update_data)
    return ApiResponse.ok(data=loan)


@router.delete("/loans/{loan_id}", response_model=ApiResponse[dict])
async def delete_loan(
    loan_id: str,
    hard_delete: bool = Query(False, alias="hardDelete", description="Permanently delete loan"),
    service: RemindersService = Depends(get_reminders_service)
) -> ApiResponse[dict]:
    """
    Delete a loan.

    By default, performs soft delete (marks as inactive).
    Use hardDelete=true to permanently remove.
    """
    success = await service.delete_loan(loan_id, hard_delete)
    return ApiResponse.ok(data={"success": success, "message": "Loan deleted successfully"})


@router.post("/loans/{loan_id}/payments/{installment_number}/pay", response_model=ApiResponse[dict])
async def mark_payment_paid(
    loan_id: str,
    installment_number: int,
    paid_amount: Optional[str] = Query(None, alias="paidAmount", description="Amount paid"),
    paid_date: Optional[date] = Query(None, alias="paidDate", description="Date of payment"),
    service: RemindersService = Depends(get_reminders_service)
) -> ApiResponse[dict]:
    """
    Mark a payment installment as paid.

    Updates payment status and recalculates loan summary.
    """
    success = await service.mark_payment_paid(
        loan_id,
        installment_number,
        paid_amount,
        paid_date
    )
    return ApiResponse.ok(data={
        "success": success,
        "message": f"Payment {installment_number} marked as paid"
    })


# Alert endpoints

@router.get("/alerts", response_model=ApiResponse[AlertsListResponse])
async def get_alerts(
    user_id: str = Query(..., alias="userId", description="User ID"),
    days_ahead: int = Query(30, alias="daysAhead", ge=1, le=90, description="Days to look ahead"),
    service: RemindersService = Depends(get_reminders_service)
) -> ApiResponse[AlertsListResponse]:
    """
    Get upcoming payment alerts for a user.

    Returns payments due within specified days, including:
    - Overdue payments
    - Urgent payments (3 days or less)
    - Upcoming payments
    """
    alerts = await service.get_alerts(user_id, days_ahead)
    return ApiResponse.ok(data=alerts)


# Calculator endpoint

@router.post("/calculate", response_model=ApiResponse[PaymentCalculationResponse])
async def calculate_payment(
    request: PaymentCalculationRequest,
    service: RemindersService = Depends(get_reminders_service)
) -> ApiResponse[PaymentCalculationResponse]:
    """
    Calculate loan payment schedule without saving.

    Useful for previewing payment schedules before committing to a loan.
    Supports multiple loan types:
    - equal_installments: Fixed monthly payment (most common)
    - reducing_balance: Decreasing payments over time
    - graduated: Payments increase annually
    - balloon: Interest only with final balloon payment
    - interest_only: Only interest paid, principal unchanged
    """
    calculation = await service.calculate_payment(request)
    return ApiResponse.ok(data=calculation)
