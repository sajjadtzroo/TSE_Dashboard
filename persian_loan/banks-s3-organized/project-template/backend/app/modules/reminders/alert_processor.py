"""
Alert Processing Utilities

Helper functions for processing payment alerts and notifications.
Extracted from service layer to improve code organization.
"""

from datetime import date, datetime
from typing import Dict, Any, List, Tuple

from app.core.logger import get_logger
from app.core.utils import convert_to_date
from app.modules.reminders.calculations import to_jalali
from app.modules.reminders.schemas import (
    AlertPriorityEnum,
    AlertResponse,
    PaymentStatusEnum
)

logger = get_logger(__name__)


def calculate_payment_priority(days_until: int) -> Tuple[AlertPriorityEnum, str, str]:
    """
    Calculate alert priority based on days until due.

    Args:
        days_until: Days until payment is due (negative if overdue)

    Returns:
        Tuple of (priority, message_en, message_fa)
    """
    if days_until <= 0:
        if days_until == 0:
            return (
                AlertPriorityEnum.URGENT,
                "Payment is due today",
                "پرداخت امروز موعد است"
            )
        else:
            days_overdue = -days_until
            return (
                AlertPriorityEnum.URGENT,
                f"Payment overdue by {days_overdue} days",
                f"پرداخت {days_overdue} روز تاخیر دارد"
            )
    elif days_until <= 3:
        return (
            AlertPriorityEnum.URGENT,
            f"Payment due in {days_until} days",
            f"پرداخت تا {days_until} روز دیگر"
        )
    elif days_until <= 7:
        return (
            AlertPriorityEnum.HIGH,
            f"Payment due in {days_until} days",
            f"پرداخت تا {days_until} روز دیگر"
        )
    else:
        return (
            AlertPriorityEnum.MEDIUM,
            f"Payment due in {days_until} days",
            f"پرداخت تا {days_until} روز دیگر"
        )


def create_alert_from_payment(
    payment: Dict[str, Any],
    today: date,
    is_overdue: bool = False
) -> AlertResponse:
    """
    Create AlertResponse from payment document.

    Args:
        payment: Payment document from database
        today: Current date
        is_overdue: Whether this payment is already overdue

    Returns:
        AlertResponse object
    """
    due_date = convert_to_date(payment["due_date"]) or today
    days_until = (due_date - today).days

    # Determine status
    if is_overdue or days_until < 0:
        status = PaymentStatusEnum.OVERDUE
        priority = AlertPriorityEnum.URGENT
        days_overdue = -days_until if days_until < 0 else 0
        message = f"Payment overdue by {days_overdue} days" if days_overdue > 0 else "Payment is due today"
        message_fa = f"پرداخت {days_overdue} روز تاخیر دارد" if days_overdue > 0 else "پرداخت امروز موعد است"
    else:
        status = PaymentStatusEnum.PENDING
        priority, message, message_fa = calculate_payment_priority(days_until)

    return AlertResponse(
        id=payment["id"],
        loan_id=payment["loan_id"],
        loan_name=payment.get("loan_name", ""),
        loan_name_fa=payment.get("loan_name_fa"),
        bank_name=payment.get("bank_name"),
        bank_name_fa=payment.get("bank_name_fa"),
        installment_number=payment["installment_number"],
        due_date=due_date,
        due_date_jalali=payment.get("due_date_jalali", to_jalali(due_date)),
        amount=payment["total_payment"],
        days_until_due=days_until,
        priority=priority,
        status=status,
        message=message,
        message_fa=message_fa
    )


def categorize_alerts(
    alerts: List[AlertResponse]
) -> Tuple[int, int, int]:
    """
    Categorize alerts by urgency.

    Args:
        alerts: List of alert responses

    Returns:
        Tuple of (urgent_count, upcoming_count, overdue_count)
    """
    urgent_count = 0
    upcoming_count = 0
    overdue_count = 0

    for alert in alerts:
        if alert.status == PaymentStatusEnum.OVERDUE:
            overdue_count += 1
        elif alert.priority == AlertPriorityEnum.URGENT:
            urgent_count += 1
        else:
            upcoming_count += 1

    return urgent_count, upcoming_count, overdue_count


def sort_alerts_by_priority(alerts: List[AlertResponse]) -> List[AlertResponse]:
    """
    Sort alerts by priority and due date.

    Priority order: OVERDUE > URGENT > HIGH > MEDIUM > LOW
    Within same priority: sort by due date (earliest first)

    Args:
        alerts: List of alerts to sort

    Returns:
        Sorted list of alerts
    """
    priority_order = {
        PaymentStatusEnum.OVERDUE: 0,
        AlertPriorityEnum.URGENT: 1,
        AlertPriorityEnum.HIGH: 2,
        AlertPriorityEnum.MEDIUM: 3,
        AlertPriorityEnum.LOW: 4,
    }

    def sort_key(alert: AlertResponse) -> Tuple[int, date]:
        # Get priority value (overdue status takes precedence)
        if alert.status == PaymentStatusEnum.OVERDUE:
            priority_val = priority_order[PaymentStatusEnum.OVERDUE]
        else:
            priority_val = priority_order.get(alert.priority, 99)

        return (priority_val, alert.due_date)

    return sorted(alerts, key=sort_key)
