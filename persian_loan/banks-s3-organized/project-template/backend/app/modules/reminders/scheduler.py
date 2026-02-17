"""
Payment Reminder Scheduler

Background task scheduler for automatic alert generation and notification sending.
Uses APScheduler for scheduled tasks.
"""

import asyncio
from datetime import date, datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.modules.reminders.calculations import to_jalali
from app.modules.reminders.repository import RemindersRepository
from app.modules.reminders.notifications import NotificationService

logger = get_logger(__name__)


class PaymentReminderScheduler:
    """
    Background scheduler for payment reminder tasks.

    Handles:
    - Daily check for upcoming payments
    - Alert generation
    - Notification sending
    - Overdue payment detection
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repository = RemindersRepository(db)
        self.notification_service = NotificationService()
        self.scheduler = AsyncIOScheduler()
        self._is_running = False

    async def start(self):
        """Start the scheduler."""
        if self._is_running:
            logger.warning("Scheduler is already running")
            return

        # Ensure database indexes
        await self.repository.ensure_indexes()

        # Schedule daily tasks
        self.scheduler.add_job(
            self.check_upcoming_payments,
            CronTrigger(hour=8, minute=0),  # Run at 8 AM daily
            id="check_upcoming_payments",
            name="Check upcoming payments",
            replace_existing=True
        )

        self.scheduler.add_job(
            self.check_overdue_payments,
            CronTrigger(hour=9, minute=0),  # Run at 9 AM daily
            id="check_overdue_payments",
            name="Check overdue payments",
            replace_existing=True
        )

        self.scheduler.add_job(
            self.send_pending_notifications,
            CronTrigger(hour="8,12,18"),  # Run 3 times daily
            id="send_notifications",
            name="Send pending notifications",
            replace_existing=True
        )

        self.scheduler.start()
        self._is_running = True
        logger.success("Payment reminder scheduler started")

    def stop(self):
        """Stop the scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            self._is_running = False
            logger.info("Payment reminder scheduler stopped")

    async def check_upcoming_payments(self):
        """
        Check for payments due in the next 3 days and create alerts.

        This runs daily to generate reminders for upcoming payments.
        """
        logger.info("Starting daily check for upcoming payments...")

        try:
            payments = await self.repository.get_payments_due_soon(days_threshold=3)
            alerts_created = 0

            for payment in payments:
                user_id = payment.get("user_id")
                if not user_id:
                    continue

                due_date = payment["due_date"]
                if isinstance(due_date, datetime):
                    due_date = due_date.date()

                days_until = (due_date - date.today()).days

                # Create alert
                alert_data = {
                    "user_id": user_id,
                    "loan_id": payment["loan_id"],
                    "installment_number": payment["installment_number"],
                    "due_date": due_date,
                    "due_date_jalali": payment.get("due_date_jalali", to_jalali(due_date)),
                    "amount": payment["total_payment"],
                    "days_until_due": days_until,
                    "priority": "urgent" if days_until <= 1 else "high",
                    "alert_type": "upcoming_payment",
                    "loan_name": payment.get("loan_name", ""),
                    "loan_name_fa": payment.get("loan_name_fa", ""),
                    "bank_name": payment.get("bank_name", ""),
                    "bank_name_fa": payment.get("bank_name_fa", ""),
                }

                await self.repository.create_alert(alert_data)
                alerts_created += 1

                # Queue notification
                await self.notification_service.queue_payment_reminder(
                    user_id=user_id,
                    loan_name=payment.get("loan_name_fa") or payment.get("loan_name", ""),
                    amount=payment["total_payment"],
                    due_date=due_date,
                    days_until=days_until
                )

            logger.info(f"Created {alerts_created} upcoming payment alerts")

        except Exception as e:
            logger.error(f"Error checking upcoming payments: {e}")

    async def check_overdue_payments(self):
        """
        Check for overdue payments and update their status.

        This runs daily to mark pending payments as overdue and create alerts.
        """
        logger.info("Starting daily check for overdue payments...")

        try:
            overdue_payments = await self.repository.get_overdue_payments()
            updated_count = 0

            for payment in overdue_payments:
                if payment["status"] == "pending":
                    # Update to overdue status
                    await self.repository.update_payment_status(
                        payment["loan_id"],
                        payment["installment_number"],
                        "overdue"
                    )
                    updated_count += 1

                    # Create alert
                    due_date = payment["due_date"]
                    if isinstance(due_date, datetime):
                        due_date = due_date.date()

                    days_overdue = (date.today() - due_date).days

                    # Get loan details for user_id
                    loan = await self.repository.get_loan_by_id(payment["loan_id"])
                    if loan:
                        alert_data = {
                            "user_id": loan["user_id"],
                            "loan_id": payment["loan_id"],
                            "installment_number": payment["installment_number"],
                            "due_date": due_date,
                            "due_date_jalali": payment.get("due_date_jalali", to_jalali(due_date)),
                            "amount": payment["total_payment"],
                            "days_overdue": days_overdue,
                            "priority": "urgent",
                            "alert_type": "overdue_payment",
                            "loan_name": loan.get("loan_name", ""),
                            "loan_name_fa": loan.get("loan_name_fa", ""),
                            "bank_name": loan.get("bank_name", ""),
                            "bank_name_fa": loan.get("bank_name_fa", ""),
                        }

                        await self.repository.create_alert(alert_data)

                        # Queue urgent notification
                        await self.notification_service.queue_overdue_notice(
                            user_id=loan["user_id"],
                            loan_name=loan.get("loan_name_fa") or loan.get("loan_name", ""),
                            amount=payment["total_payment"],
                            due_date=due_date,
                            days_overdue=days_overdue
                        )

            logger.info(f"Updated {updated_count} payments to overdue status")

        except Exception as e:
            logger.error(f"Error checking overdue payments: {e}")

    async def send_pending_notifications(self):
        """
        Send queued notifications via email/SMS.

        This runs multiple times daily to deliver pending notifications.
        """
        logger.info("Processing pending notifications...")

        try:
            await self.notification_service.process_pending()
        except Exception as e:
            logger.error(f"Error processing notifications: {e}")


# Global scheduler instance
_scheduler: Optional[PaymentReminderScheduler] = None


def get_scheduler() -> Optional[PaymentReminderScheduler]:
    """Get the global scheduler instance."""
    return _scheduler


async def init_scheduler(db: AsyncIOMotorDatabase):
    """Initialize and start the scheduler."""
    global _scheduler
    _scheduler = PaymentReminderScheduler(db)
    await _scheduler.start()


def shutdown_scheduler():
    """Shutdown the scheduler."""
    global _scheduler
    if _scheduler:
        _scheduler.stop()
        _scheduler = None
