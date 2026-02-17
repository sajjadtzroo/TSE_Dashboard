"""
Reminders / My-Loans API endpoints.
Provides user loan tracking, payment schedules, and alerts.
These endpoints match the frontend reminders.service.ts contract.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/loans/reminders", tags=["reminders"])


def _wrap(data):
    """Wrap response in ApiEnvelope format expected by frontend."""
    return {
        "success": True,
        "data": data,
        "meta": {"timestamp": datetime.now(timezone.utc).isoformat()},
        "errors": None,
    }


# ── Loans CRUD ───────────────────────────────────────────────────────────────

@router.get("/loans")
def list_user_loans(
    userId: Optional[str] = Query(None),
    activeOnly: Optional[bool] = Query(True),
):
    """Get all loans for a user. Returns empty list for now."""
    return _wrap({
        "total": 0,
        "active": 0,
        "completed": 0,
        "loans": [],
    })


@router.post("/loans")
def create_user_loan():
    """Create a new tracked loan (stub)."""
    return _wrap({
        "success": True,
        "message": "Loan tracking feature coming soon.",
    })


@router.get("/loans/{loan_id}")
def get_user_loan(
    loan_id: str,
    includeSchedule: Optional[bool] = Query(True),
):
    """Get a specific loan by ID (stub)."""
    return _wrap(None)


@router.put("/loans/{loan_id}")
def update_user_loan(loan_id: str):
    """Update a tracked loan (stub)."""
    return _wrap({
        "success": True,
        "message": "Loan updated.",
    })


@router.delete("/loans/{loan_id}")
def delete_user_loan(
    loan_id: str,
    hardDelete: Optional[bool] = Query(False),
):
    """Delete a tracked loan (stub)."""
    return _wrap({
        "success": True,
        "message": "Loan deleted.",
    })


# ── Payments ─────────────────────────────────────────────────────────────────

@router.post("/loans/{loan_id}/payments/{installment_number}/pay")
def mark_payment_paid(
    loan_id: str,
    installment_number: int,
    paidAmount: Optional[str] = Query(None),
    paidDate: Optional[str] = Query(None),
):
    """Mark a payment installment as paid (stub)."""
    return _wrap({
        "success": True,
        "message": f"Installment {installment_number} marked as paid.",
    })


# ── Alerts ───────────────────────────────────────────────────────────────────

@router.get("/alerts")
def list_alerts(
    userId: Optional[str] = Query(None),
    daysAhead: Optional[int] = Query(30),
):
    """Get payment alerts for a user. Returns empty list for now."""
    return _wrap({
        "total": 0,
        "urgent": 0,
        "upcoming": 0,
        "overdue": 0,
        "alerts": [],
    })


# ── Calculator ───────────────────────────────────────────────────────────────

@router.post("/calculate")
def calculate_payment():
    """Calculate payment schedule without saving (stub)."""
    return _wrap({
        "monthlyPayment": "0",
        "totalPayment": "0",
        "totalInterest": "0",
        "effectiveRate": "0",
        "paymentSchedule": [],
    })
