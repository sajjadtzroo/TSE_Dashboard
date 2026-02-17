"""
Payment Reminders Service

Business logic for loan management and payment alerts.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.exceptions import NotFoundException, ValidationException
from app.core.logger import get_logger
from app.core.utils import convert_to_date, convert_to_datetime
from app.modules.reminders.alert_processor import (
    create_alert_from_payment,
    categorize_alerts,
    sort_alerts_by_priority
)
from app.modules.reminders.calculations import (
    calculate_loan_summary,
    generate_payment_schedule,
    to_jalali,
)
from app.modules.reminders.repository import RemindersRepository
from app.modules.reminders.schemas import (
    AlertPriorityEnum,
    AlertResponse,
    AlertsListResponse,
    LoanListResponse,
    LoanTypeEnum,
    PaymentCalculationRequest,
    PaymentCalculationResponse,
    PaymentScheduleItem,
    PaymentStatusEnum,
    UserLoanCreate,
    UserLoanResponse,
    UserLoanUpdate,
    UserLoanWithSchedule,
)

logger = get_logger(__name__)


class RemindersService:
    """Service for payment reminders business logic."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = RemindersRepository(db)

    async def create_loan(self, loan_data: UserLoanCreate) -> UserLoanWithSchedule:
        """Create a new user loan with payment schedule."""
        # Calculate loan summary
        summary = calculate_loan_summary(
            loan_data.principal_amount,
            loan_data.interest_rate,
            loan_data.total_installments,
            loan_data.loan_type
        )

        # Generate payment schedule
        schedule = generate_payment_schedule(
            loan_data.principal_amount,
            loan_data.interest_rate,
            loan_data.total_installments,
            loan_data.loan_type,
            loan_data.start_date,
            loan_data.payment_day
        )

        # Find next payment date
        today = date.today()
        next_payment = None
        next_payment_jalali = None
        for payment in schedule:
            if payment.due_date >= today and payment.status == PaymentStatusEnum.PENDING:
                next_payment = payment.due_date
                next_payment_jalali = payment.due_date_jalali
                break

        # Prepare loan document with datetime conversion for MongoDB
        start_datetime = convert_to_datetime(loan_data.start_date)
        next_payment_datetime = convert_to_datetime(next_payment)

        loan_doc = {
            "user_id": loan_data.user_id,
            "loan_name": loan_data.loan_name,
            "loan_name_fa": loan_data.loan_name_fa,
            "bank_name": loan_data.bank_name,
            "bank_name_fa": loan_data.bank_name_fa,
            "principal_amount": loan_data.principal_amount,
            "interest_rate": loan_data.interest_rate,
            "loan_type": loan_data.loan_type.value,
            "total_installments": loan_data.total_installments,
            "start_date": start_datetime,
            "payment_day": loan_data.payment_day,
            "description": loan_data.description,
            "notes": loan_data.notes,
            "monthly_payment": summary["monthly_payment"],
            "total_payment": summary["total_payment"],
            "total_interest": summary["total_interest"],
            "paid_installments": 0,
            "remaining_installments": loan_data.total_installments,
            "next_payment_date": next_payment_datetime,
            "next_payment_date_jalali": next_payment_jalali,
        }

        # Save loan with rollback on schedule failure
        loan_id = None
        try:
            loan_id = await self.repository.create_loan(loan_doc)

            # Save payment schedule with datetime conversion
            schedule_docs = [
                {
                    "installment_number": p.installment_number,
                    "due_date": convert_to_datetime(p.due_date),
                    "due_date_jalali": p.due_date_jalali,
                    "principal_payment": p.principal_payment,
                    "interest_payment": p.interest_payment,
                    "total_payment": p.total_payment,
                    "remaining_balance": p.remaining_balance,
                    "status": p.status.value,
                }
                for p in schedule
            ]
            await self.repository.save_payment_schedule(loan_id, schedule_docs)

            # Return complete loan with schedule
            loan = await self.repository.get_loan_by_id(loan_id)
            loan_schedule = await self.repository.get_payment_schedule(loan_id)

            return self._build_loan_with_schedule_response(loan, loan_schedule)

        except Exception as e:
            # Rollback: Delete loan if schedule save failed
            if loan_id:
                try:
                    await self.repository.delete_loan(loan_id, hard_delete=True)
                    logger.warning(f"Rolled back loan creation for loan_id: {loan_id}")
                except Exception as rollback_error:
                    logger.error(f"Rollback failed: {rollback_error}")

            logger.error(f"Failed to create loan: {e}")
            raise Exception(f"Failed to create loan: {str(e)}")

    async def get_loan(
        self,
        loan_id: str,
        include_schedule: bool = False
    ) -> UserLoanResponse | UserLoanWithSchedule:
        """Get a loan by ID."""
        loan = await self.repository.get_loan_by_id(loan_id)
        if not loan:
            raise NotFoundException(f"Loan {loan_id} not found")

        if include_schedule:
            schedule = await self.repository.get_payment_schedule(loan_id)
            return self._build_loan_with_schedule_response(loan, schedule)

        return self._build_loan_response(loan)

    async def get_user_loans(
        self,
        user_id: str,
        active_only: bool = True
    ) -> LoanListResponse:
        """Get all loans for a user."""
        loans = await self.repository.get_loans_by_user(user_id, active_only)

        loan_responses = []
        active_count = 0
        completed_count = 0

        for loan in loans:
            response = self._build_loan_response(loan)
            loan_responses.append(response)

            if loan.get("is_active", True):
                active_count += 1
            else:
                completed_count += 1

        return LoanListResponse(
            total=len(loans),
            active=active_count,
            completed=completed_count,
            loans=loan_responses
        )

    async def update_loan(
        self,
        loan_id: str,
        update_data: UserLoanUpdate
    ) -> UserLoanResponse:
        """Update a loan."""
        loan = await self.repository.get_loan_by_id(loan_id)
        if not loan:
            raise NotFoundException(f"Loan {loan_id} not found")

        # Build update dict
        update_dict = {}
        for field, value in update_data.model_dump(exclude_unset=True, by_alias=False).items():
            if value is not None:
                update_dict[field] = value

        if not update_dict:
            return self._build_loan_response(loan)

        # If financial parameters changed, recalculate schedule
        financial_fields = {"principal_amount", "interest_rate", "loan_type",
                           "total_installments", "start_date", "payment_day"}

        if financial_fields & set(update_dict.keys()):
            # Merge with existing values
            principal = update_dict.get("principal_amount", loan["principal_amount"])
            rate = update_dict.get("interest_rate", loan["interest_rate"])
            loan_type_str = update_dict.get("loan_type", loan["loan_type"])
            if isinstance(loan_type_str, LoanTypeEnum):
                loan_type = loan_type_str
            else:
                loan_type = LoanTypeEnum(loan_type_str)
            installments = update_dict.get("total_installments", loan["total_installments"])
            start = update_dict.get("start_date", loan["start_date"])
            day = update_dict.get("payment_day", loan["payment_day"])

            # Recalculate
            summary = calculate_loan_summary(principal, rate, installments, loan_type)
            schedule = generate_payment_schedule(
                principal, rate, installments, loan_type, start, day
            )

            update_dict["monthly_payment"] = summary["monthly_payment"]
            update_dict["total_payment"] = summary["total_payment"]
            update_dict["total_interest"] = summary["total_interest"]

            # Update next payment date
            today = date.today()
            next_payment = None
            next_payment_jalali = None
            for payment in schedule:
                if payment.due_date >= today and payment.status == PaymentStatusEnum.PENDING:
                    next_payment = payment.due_date
                    next_payment_jalali = payment.due_date_jalali
                    break

            update_dict["next_payment_date"] = next_payment
            update_dict["next_payment_date_jalali"] = next_payment_jalali
            update_dict["remaining_installments"] = installments

            # Update payment schedule
            schedule_docs = [
                {
                    "installment_number": p.installment_number,
                    "due_date": p.due_date,
                    "due_date_jalali": p.due_date_jalali,
                    "principal_payment": p.principal_payment,
                    "interest_payment": p.interest_payment,
                    "total_payment": p.total_payment,
                    "remaining_balance": p.remaining_balance,
                    "status": p.status.value,
                }
                for p in schedule
            ]
            await self.repository.save_payment_schedule(loan_id, schedule_docs)

        # Handle loan_type enum conversion
        if "loan_type" in update_dict and isinstance(update_dict["loan_type"], LoanTypeEnum):
            update_dict["loan_type"] = update_dict["loan_type"].value

        await self.repository.update_loan(loan_id, update_dict)

        updated_loan = await self.repository.get_loan_by_id(loan_id)
        return self._build_loan_response(updated_loan)

    async def delete_loan(self, loan_id: str, hard_delete: bool = False) -> bool:
        """Delete a loan."""
        loan = await self.repository.get_loan_by_id(loan_id)
        if not loan:
            raise NotFoundException(f"Loan {loan_id} not found")

        if hard_delete:
            return await self.repository.hard_delete_loan(loan_id)
        return await self.repository.delete_loan(loan_id)

    async def get_alerts(
        self,
        user_id: str,
        days_ahead: int = 30
    ) -> AlertsListResponse:
        """
        Get upcoming payment alerts for a user.

        Refactored to use alert processor utilities for better code organization.

        Args:
            user_id: User identifier
            days_ahead: Number of days to look ahead for payments

        Returns:
            AlertsListResponse with categorized alerts
        """
        # Fetch payments in parallel
        upcoming_payments = await self.repository.get_upcoming_payments(user_id, days_ahead)
        overdue_payments = await self.repository.get_overdue_payments(user_id)

        today = date.today()
        alerts: List[AlertResponse] = []

        # Process overdue payments
        for payment in overdue_payments:
            alert = create_alert_from_payment(payment, today, is_overdue=True)
            alerts.append(alert)

        # Process upcoming payments
        for payment in upcoming_payments:
            alert = create_alert_from_payment(payment, today, is_overdue=False)
            alerts.append(alert)

        # Sort alerts by priority and due date
        alerts = sort_alerts_by_priority(alerts)

        # Categorize alerts
        urgent_count, upcoming_count, overdue_count = categorize_alerts(alerts)

        return AlertsListResponse(
            total=len(alerts),
            urgent=urgent_count,
            upcoming=upcoming_count,
            overdue=overdue_count,
            alerts=alerts
        )

    async def mark_payment_paid(
        self,
        loan_id: str,
        installment_number: int,
        paid_amount: Optional[str] = None,
        paid_date: Optional[date] = None
    ) -> bool:
        """Mark a payment as paid."""
        loan = await self.repository.get_loan_by_id(loan_id)
        if not loan:
            raise NotFoundException(f"Loan {loan_id} not found")

        actual_paid_date = paid_date or date.today()

        success = await self.repository.update_payment_status(
            loan_id,
            installment_number,
            PaymentStatusEnum.PAID.value,
            paid_amount,
            actual_paid_date
        )

        if success:
            # Update loan summary
            paid = loan.get("paid_installments", 0) + 1
            remaining = loan["total_installments"] - paid

            # Find new next payment date
            schedule = await self.repository.get_payment_schedule(loan_id)
            today = date.today()
            next_payment = None
            next_payment_jalali = None

            for payment in schedule:
                payment_date = payment["due_date"]
                if isinstance(payment_date, datetime):
                    payment_date = payment_date.date()

                if payment["status"] == "pending" and payment_date >= today:
                    next_payment = payment_date
                    next_payment_jalali = payment.get("due_date_jalali", to_jalali(payment_date))
                    break

            await self.repository.update_loan(loan_id, {
                "paid_installments": paid,
                "remaining_installments": remaining,
                "next_payment_date": next_payment,
                "next_payment_date_jalali": next_payment_jalali
            })

        return success

    async def calculate_payment(
        self,
        request: PaymentCalculationRequest
    ) -> PaymentCalculationResponse:
        """Calculate payment schedule without saving."""
        summary = calculate_loan_summary(
            request.principal_amount,
            request.interest_rate,
            request.total_installments,
            request.loan_type
        )

        start = request.start_date or date.today()
        day = request.payment_day or 1

        schedule = generate_payment_schedule(
            request.principal_amount,
            request.interest_rate,
            request.total_installments,
            request.loan_type,
            start,
            day
        )

        return PaymentCalculationResponse(
            monthly_payment=summary["monthly_payment"],
            total_payment=summary["total_payment"],
            total_interest=summary["total_interest"],
            effective_rate=summary["effective_rate"],
            payment_schedule=schedule
        )

    def _build_loan_response(self, loan: Dict[str, Any]) -> UserLoanResponse:
        """Build loan response from database document."""
        start_date = loan["start_date"]
        if isinstance(start_date, datetime):
            start_date = start_date.date()

        next_payment = loan.get("next_payment_date")
        if next_payment and isinstance(next_payment, datetime):
            next_payment = next_payment.date()

        return UserLoanResponse(
            id=loan["id"],
            user_id=loan["user_id"],
            loan_name=loan["loan_name"],
            loan_name_fa=loan.get("loan_name_fa"),
            bank_name=loan.get("bank_name"),
            bank_name_fa=loan.get("bank_name_fa"),
            principal_amount=loan["principal_amount"],
            interest_rate=loan["interest_rate"],
            loan_type=LoanTypeEnum(loan["loan_type"]),
            total_installments=loan["total_installments"],
            start_date=start_date,
            payment_day=loan["payment_day"],
            description=loan.get("description"),
            notes=loan.get("notes"),
            monthly_payment=loan["monthly_payment"],
            total_payment=loan["total_payment"],
            total_interest=loan["total_interest"],
            paid_installments=loan.get("paid_installments", 0),
            remaining_installments=loan.get("remaining_installments", loan["total_installments"]),
            next_payment_date=next_payment,
            next_payment_date_jalali=loan.get("next_payment_date_jalali"),
            is_active=loan.get("is_active", True),
            created_at=loan["created_at"],
            updated_at=loan["updated_at"]
        )

    def _build_loan_with_schedule_response(
        self,
        loan: Dict[str, Any],
        schedule: List[Dict[str, Any]]
    ) -> UserLoanWithSchedule:
        """Build loan response with payment schedule."""
        base = self._build_loan_response(loan)

        schedule_items = []
        for payment in schedule:
            due_date = payment["due_date"]
            if isinstance(due_date, datetime):
                due_date = due_date.date()

            paid_date = payment.get("paid_date")
            if paid_date and isinstance(paid_date, datetime):
                paid_date = paid_date.date()

            schedule_items.append(PaymentScheduleItem(
                installment_number=payment["installment_number"],
                due_date=due_date,
                due_date_jalali=payment.get("due_date_jalali", to_jalali(due_date)),
                principal_payment=payment["principal_payment"],
                interest_payment=payment["interest_payment"],
                total_payment=payment["total_payment"],
                remaining_balance=payment["remaining_balance"],
                status=PaymentStatusEnum(payment["status"]),
                paid_date=paid_date,
                paid_amount=payment.get("paid_amount")
            ))

        return UserLoanWithSchedule(
            **base.model_dump(by_alias=False),
            payment_schedule=schedule_items
        )
