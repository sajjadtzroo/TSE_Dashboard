"""
Notification Service

Handles email and SMS notifications for payment reminders.
This is a placeholder implementation - replace with actual email/SMS providers.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from app.core.logger import get_logger
from app.modules.reminders.calculations import to_jalali

logger = get_logger(__name__)


class NotificationService:
    """
    Service for sending payment notifications.

    Currently implements placeholder methods for:
    - Email notifications
    - SMS notifications
    - Push notifications

    Replace these with actual implementations using services like:
    - Email: SendGrid, Mailgun, AWS SES
    - SMS: Twilio, Kavenegar (Iranian SMS provider)
    - Push: Firebase Cloud Messaging
    """

    def __init__(self):
        self._pending_notifications: List[Dict[str, Any]] = []
        # Configuration would typically come from environment variables
        self.email_enabled = False
        self.sms_enabled = False
        self.push_enabled = False

    def _format_amount(self, amount: str) -> str:
        """Format amount for display (add thousands separator)."""
        try:
            num = int(float(amount))
            return "{:,}".format(num)
        except (ValueError, TypeError):
            return amount

    def _format_date_fa(self, d: date) -> str:
        """Format date in Persian."""
        jalali = to_jalali(d)
        persian_months = [
            "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
            "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
        ]
        parts = jalali.split("/")
        if len(parts) == 3:
            year, month, day = parts
            month_name = persian_months[int(month) - 1]
            return f"{day} {month_name} {year}"
        return jalali

    async def queue_payment_reminder(
        self,
        user_id: str,
        loan_name: str,
        amount: str,
        due_date: date,
        days_until: int
    ):
        """
        Queue a payment reminder notification.

        Args:
            user_id: User identifier
            loan_name: Name of the loan
            amount: Payment amount
            due_date: Due date
            days_until: Days until payment is due
        """
        formatted_amount = self._format_amount(amount)
        formatted_date = self._format_date_fa(due_date)

        if days_until == 0:
            message_fa = f"یادآوری: پرداخت قسط وام «{loan_name}» امروز موعد است. مبلغ: {formatted_amount} تومان"
            message_en = f"Reminder: Payment for loan '{loan_name}' is due today. Amount: {formatted_amount} Toman"
            priority = "urgent"
        elif days_until == 1:
            message_fa = f"یادآوری: پرداخت قسط وام «{loan_name}» فردا موعد است. مبلغ: {formatted_amount} تومان"
            message_en = f"Reminder: Payment for loan '{loan_name}' is due tomorrow. Amount: {formatted_amount} Toman"
            priority = "urgent"
        else:
            message_fa = f"یادآوری: پرداخت قسط وام «{loan_name}» تا {days_until} روز دیگر ({formatted_date}). مبلغ: {formatted_amount} تومان"
            message_en = f"Reminder: Payment for loan '{loan_name}' is due in {days_until} days. Amount: {formatted_amount} Toman"
            priority = "high"

        notification = {
            "type": "payment_reminder",
            "user_id": user_id,
            "loan_name": loan_name,
            "amount": amount,
            "due_date": due_date.isoformat(),
            "days_until": days_until,
            "message_fa": message_fa,
            "message_en": message_en,
            "priority": priority,
            "created_at": datetime.utcnow().isoformat(),
            "status": "pending"
        }

        self._pending_notifications.append(notification)
        logger.info(f"Queued payment reminder for user {user_id}: {loan_name}")

    async def queue_overdue_notice(
        self,
        user_id: str,
        loan_name: str,
        amount: str,
        due_date: date,
        days_overdue: int
    ):
        """
        Queue an overdue payment notification.

        Args:
            user_id: User identifier
            loan_name: Name of the loan
            amount: Payment amount
            due_date: Original due date
            days_overdue: Number of days payment is overdue
        """
        formatted_amount = self._format_amount(amount)
        formatted_date = self._format_date_fa(due_date)

        message_fa = f"هشدار: پرداخت قسط وام «{loan_name}» {days_overdue} روز تاخیر دارد! مبلغ: {formatted_amount} تومان. تاریخ سررسید: {formatted_date}"
        message_en = f"Warning: Payment for loan '{loan_name}' is {days_overdue} days overdue! Amount: {formatted_amount} Toman. Due date was: {due_date.isoformat()}"

        notification = {
            "type": "overdue_notice",
            "user_id": user_id,
            "loan_name": loan_name,
            "amount": amount,
            "due_date": due_date.isoformat(),
            "days_overdue": days_overdue,
            "message_fa": message_fa,
            "message_en": message_en,
            "priority": "urgent",
            "created_at": datetime.utcnow().isoformat(),
            "status": "pending"
        }

        self._pending_notifications.append(notification)
        logger.warning(f"Queued overdue notice for user {user_id}: {loan_name} ({days_overdue} days)")

    async def process_pending(self):
        """
        Process and send all pending notifications.

        This method should be called periodically by the scheduler.
        """
        if not self._pending_notifications:
            logger.debug("No pending notifications to process")
            return

        sent_count = 0
        failed_count = 0

        for notification in self._pending_notifications[:]:  # Copy list for safe iteration
            try:
                success = await self._send_notification(notification)
                if success:
                    notification["status"] = "sent"
                    notification["sent_at"] = datetime.utcnow().isoformat()
                    sent_count += 1
                    self._pending_notifications.remove(notification)
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Failed to send notification: {e}")
                failed_count += 1

        logger.info(f"Processed notifications: {sent_count} sent, {failed_count} failed")

    async def _send_notification(self, notification: Dict[str, Any]) -> bool:
        """
        Send a single notification via configured channels.

        This is a placeholder implementation.
        Replace with actual email/SMS sending logic.
        """
        user_id = notification["user_id"]
        message_fa = notification["message_fa"]
        priority = notification["priority"]

        # Placeholder: Log the notification
        logger.info(f"[NOTIFICATION] To: {user_id} | Priority: {priority}")
        logger.info(f"[NOTIFICATION] Message: {message_fa}")

        # Simulate sending (always succeeds in placeholder)
        # In production, implement actual sending here:

        # Example email sending (commented out):
        # if self.email_enabled:
        #     await self._send_email(user_id, notification)

        # Example SMS sending (commented out):
        # if self.sms_enabled:
        #     await self._send_sms(user_id, notification)

        return True

    async def _send_email(self, user_id: str, notification: Dict[str, Any]) -> bool:
        """
        Send email notification.

        Placeholder for email sending implementation.
        Use services like SendGrid, Mailgun, or AWS SES.
        """
        # Example implementation:
        # from sendgrid import SendGridAPIClient
        # from sendgrid.helpers.mail import Mail
        #
        # message = Mail(
        #     from_email='noreply@yourdomain.com',
        #     to_emails=user_email,  # Need to look up user email
        #     subject='یادآوری پرداخت قسط',
        #     html_content=self._render_email_template(notification)
        # )
        # sg = SendGridAPIClient(api_key=os.environ.get('SENDGRID_API_KEY'))
        # response = sg.send(message)
        # return response.status_code == 202

        logger.debug(f"Email notification would be sent to user {user_id}")
        return True

    async def _send_sms(self, user_id: str, notification: Dict[str, Any]) -> bool:
        """
        Send SMS notification.

        Placeholder for SMS sending implementation.
        For Iranian users, use Kavenegar or similar services.
        """
        # Example implementation with Kavenegar:
        # from kavenegar import KavenegarAPI
        #
        # api = KavenegarAPI('YOUR-API-KEY')
        # params = {
        #     'receptor': user_phone,  # Need to look up user phone
        #     'message': notification['message_fa']
        # }
        # response = api.sms_send(params)
        # return response is not None

        logger.debug(f"SMS notification would be sent to user {user_id}")
        return True

    def _render_email_template(self, notification: Dict[str, Any]) -> str:
        """
        Render email HTML template.

        In production, use a proper templating engine like Jinja2.
        """
        return f"""
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Tahoma, Arial, sans-serif; direction: rtl; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #1a1a1a; color: #fff; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background: #f5f5f5; }}
                .amount {{ font-size: 24px; color: #2563eb; font-weight: bold; }}
                .urgent {{ color: #dc2626; }}
                .footer {{ padding: 10px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>یادآوری پرداخت قسط</h1>
                </div>
                <div class="content">
                    <p>{notification['message_fa']}</p>
                    <p class="amount">مبلغ: {self._format_amount(notification['amount'])} تومان</p>
                </div>
                <div class="footer">
                    <p>این پیام به صورت خودکار ارسال شده است.</p>
                </div>
            </div>
        </body>
        </html>
        """

    def get_pending_count(self) -> int:
        """Get count of pending notifications."""
        return len(self._pending_notifications)

    def clear_pending(self):
        """Clear all pending notifications (for testing)."""
        self._pending_notifications.clear()
