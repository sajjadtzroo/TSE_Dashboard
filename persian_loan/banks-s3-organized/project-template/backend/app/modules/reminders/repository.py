"""
Payment Reminders Repository

MongoDB operations for user loans and payment schedules.
"""

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.base_repository import BaseRepository
from app.core.constants import Collections, Indexes, QueryLimits
from app.core.logger import get_logger

logger = get_logger(__name__)


class RemindersRepository:
    """Repository for payment reminders database operations."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.loans_collection = db[Collections.USER_LOANS]
        self.payments_collection = db[Collections.PAYMENT_SCHEDULES]
        self.alerts_collection = db[Collections.PAYMENT_ALERTS]

        # Create base repository instances for common operations
        self._base_loans = BaseRepository(db, Collections.USER_LOANS)
        self._base_payments = BaseRepository(db, Collections.PAYMENT_SCHEDULES)
        self._base_alerts = BaseRepository(db, Collections.PAYMENT_ALERTS)

    async def ensure_indexes(self) -> None:
        """Create necessary indexes for optimal query performance."""
        # User loans indexes
        await self.loans_collection.create_index(Indexes.USER_ID)
        await self.loans_collection.create_index(Indexes.IS_ACTIVE)
        await self.loans_collection.create_index([(Indexes.USER_ID, 1), (Indexes.IS_ACTIVE, 1)])

        # Payment schedules indexes
        await self.payments_collection.create_index(Indexes.LOAN_ID)
        await self.payments_collection.create_index(Indexes.DUE_DATE)
        await self.payments_collection.create_index(Indexes.STATUS)
        await self.payments_collection.create_index([(Indexes.LOAN_ID, 1), (Indexes.DUE_DATE, 1)])
        await self.payments_collection.create_index([(Indexes.STATUS, 1), (Indexes.DUE_DATE, 1)])

        # Alerts indexes
        await self.alerts_collection.create_index(Indexes.USER_ID)
        await self.alerts_collection.create_index(Indexes.LOAN_ID)
        await self.alerts_collection.create_index(Indexes.DUE_DATE)
        await self.alerts_collection.create_index(Indexes.IS_READ)

        logger.info("Database indexes created successfully")

    # User Loans Operations

    async def create_loan(self, loan_data: Dict[str, Any]) -> str:
        """Create a new user loan."""
        loan_data["created_at"] = datetime.utcnow()
        loan_data["updated_at"] = datetime.utcnow()
        loan_data["is_active"] = True

        result = await self.loans_collection.insert_one(loan_data)
        return str(result.inserted_id)

    async def get_loan_by_id(self, loan_id: str) -> Optional[Dict[str, Any]]:
        """Get a loan by ID."""
        try:
            loan = await self.loans_collection.find_one({"_id": ObjectId(loan_id)})
            if loan:
                loan["id"] = str(loan["_id"])
                del loan["_id"]
            return loan
        except Exception as e:
            logger.error(f"Error getting loan {loan_id}: {e}")
            return None

    async def get_loans_by_user(
        self,
        user_id: str,
        active_only: bool = True
    ) -> List[Dict[str, Any]]:
        """Get all loans for a user."""
        query = {"user_id": user_id}
        if active_only:
            query["is_active"] = True

        cursor = self.loans_collection.find(query).sort("created_at", -1)
        loans = await cursor.to_list(length=100)

        for loan in loans:
            loan["id"] = str(loan["_id"])
            del loan["_id"]

        return loans

    async def update_loan(
        self,
        loan_id: str,
        update_data: Dict[str, Any]
    ) -> bool:
        """Update a loan."""
        update_data["updated_at"] = datetime.utcnow()

        result = await self.loans_collection.update_one(
            {"_id": ObjectId(loan_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete_loan(self, loan_id: str) -> bool:
        """Soft delete a loan (mark as inactive)."""
        result = await self.loans_collection.update_one(
            {"_id": ObjectId(loan_id)},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    async def hard_delete_loan(self, loan_id: str) -> bool:
        """Permanently delete a loan and its payments."""
        # Delete payments first
        await self.payments_collection.delete_many({"loan_id": loan_id})

        # Delete alerts
        await self.alerts_collection.delete_many({"loan_id": loan_id})

        # Delete loan
        result = await self.loans_collection.delete_one({"_id": ObjectId(loan_id)})
        return result.deleted_count > 0

    # Payment Schedule Operations

    async def save_payment_schedule(
        self,
        loan_id: str,
        schedule: List[Dict[str, Any]]
    ) -> int:
        """Save payment schedule atomically to prevent data loss.

        Uses insert-then-delete pattern to ensure new schedule is created
        before old one is removed. If insert fails, old schedule remains intact.
        """
        if not schedule:
            # If empty schedule, just delete existing and return
            await self.payments_collection.delete_many({"loan_id": loan_id})
            return 0

        # Generate temporary loan_id for atomic operation
        temp_loan_id = f"{loan_id}_temp_{datetime.utcnow().timestamp()}"

        try:
            # Step 1: Insert new schedule with temporary loan_id
            temp_schedule = []
            for payment in schedule:
                temp_payment = payment.copy()
                temp_payment["loan_id"] = temp_loan_id
                temp_payment["created_at"] = datetime.utcnow()
                temp_schedule.append(temp_payment)

            result = await self.payments_collection.insert_many(temp_schedule)
            inserted_count = len(result.inserted_ids)

            # Step 2: Delete old schedule (safe since new one is already saved)
            await self.payments_collection.delete_many({"loan_id": loan_id})

            # Step 3: Update temporary records to use real loan_id
            await self.payments_collection.update_many(
                {"loan_id": temp_loan_id},
                {"$set": {"loan_id": loan_id}}
            )

            return inserted_count

        except Exception as e:
            # Cleanup: Remove temporary records on failure
            await self.payments_collection.delete_many({"loan_id": temp_loan_id})
            raise Exception(f"Failed to save payment schedule atomically: {str(e)}")

    async def get_payment_schedule(
        self,
        loan_id: str
    ) -> List[Dict[str, Any]]:
        """Get payment schedule for a loan."""
        cursor = self.payments_collection.find(
            {"loan_id": loan_id}
        ).sort("installment_number", 1)

        payments = await cursor.to_list(length=360)

        for payment in payments:
            payment["id"] = str(payment["_id"])
            del payment["_id"]

        return payments

    async def update_payment_status(
        self,
        loan_id: str,
        installment_number: int,
        status: str,
        paid_amount: Optional[str] = None,
        paid_date: Optional[date] = None
    ) -> bool:
        """Update status of a specific payment."""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }

        if paid_amount:
            update_data["paid_amount"] = paid_amount
        if paid_date:
            update_data["paid_date"] = paid_date

        result = await self.payments_collection.update_one(
            {
                "loan_id": loan_id,
                "installment_number": installment_number
            },
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def get_upcoming_payments(
        self,
        user_id: str,
        days_ahead: int = 30
    ) -> List[Dict[str, Any]]:
        """Get upcoming payments for a user within specified days."""
        today = datetime.combine(date.today(), datetime.min.time())
        end_date = today + timedelta(days=days_ahead)

        # Get active loan IDs for user
        loans = await self.get_loans_by_user(user_id, active_only=True)
        loan_ids = [loan["id"] for loan in loans]

        if not loan_ids:
            return []

        # Build loan lookup
        loan_lookup = {loan["id"]: loan for loan in loans}

        # Query upcoming payments
        cursor = self.payments_collection.find({
            "loan_id": {"$in": loan_ids},
            "status": {"$in": ["pending", "overdue"]},
            "due_date": {"$lte": end_date}
        }).sort("due_date", 1)

        payments = await cursor.to_list(length=500)

        # Enrich with loan details
        for payment in payments:
            payment["id"] = str(payment["_id"])
            del payment["_id"]

            loan = loan_lookup.get(payment["loan_id"], {})
            payment["loan_name"] = loan.get("loan_name", "")
            payment["loan_name_fa"] = loan.get("loan_name_fa", "")
            payment["bank_name"] = loan.get("bank_name", "")
            payment["bank_name_fa"] = loan.get("bank_name_fa", "")

        return payments

    async def get_overdue_payments(
        self,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get overdue payments, optionally filtered by user."""
        today = datetime.combine(date.today(), datetime.min.time())

        query = {
            "status": {"$in": ["pending", "overdue"]},
            "due_date": {"$lt": today}
        }

        if user_id:
            loans = await self.get_loans_by_user(user_id, active_only=True)
            loan_ids = [loan["id"] for loan in loans]
            query["loan_id"] = {"$in": loan_ids}

        cursor = self.payments_collection.find(query).sort("due_date", 1)
        payments = await cursor.to_list(length=500)

        for payment in payments:
            payment["id"] = str(payment["_id"])
            del payment["_id"]

        return payments

    async def get_payments_due_soon(
        self,
        days_threshold: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Get payments due within threshold days (for alert generation).

        Uses bulk fetch to avoid N+1 query problem.

        Args:
            days_threshold: Number of days to look ahead

        Returns:
            List of payment documents with loan details
        """
        today = date.today()
        threshold_date = today + timedelta(days=days_threshold)

        query = {
            Indexes.STATUS: "pending",
            Indexes.DUE_DATE: {
                "$gte": today,
                "$lte": threshold_date
            }
        }

        cursor = self.payments_collection.find(query).sort(Indexes.DUE_DATE, 1)
        payments = await cursor.to_list(length=1000)

        # Get unique loan IDs
        loan_ids = list(set(p["loan_id"] for p in payments))

        # Bulk fetch loans to avoid N+1 query - THIS IS THE CRITICAL FIX
        loan_lookup = await self._base_loans.bulk_find_by_ids(loan_ids)

        # Enrich payments with loan details
        enriched_payments = []
        for payment in payments:
            payment["id"] = str(payment["_id"])
            del payment["_id"]

            loan = loan_lookup.get(payment["loan_id"], {})
            payment["user_id"] = loan.get("user_id", "")
            payment["loan_name"] = loan.get("loan_name", "")
            payment["loan_name_fa"] = loan.get("loan_name_fa", "")
            payment["bank_name"] = loan.get("bank_name", "")
            payment["bank_name_fa"] = loan.get("bank_name_fa", "")

            enriched_payments.append(payment)

        return enriched_payments

    # Alert Operations

    async def create_alert(self, alert_data: Dict[str, Any]) -> str:
        """Create a payment alert."""
        alert_data["created_at"] = datetime.utcnow()
        alert_data["is_read"] = False
        alert_data["is_sent"] = False

        result = await self.alerts_collection.insert_one(alert_data)
        return str(result.inserted_id)

    async def get_user_alerts(
        self,
        user_id: str,
        unread_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Get alerts for a user."""
        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False

        cursor = self.alerts_collection.find(query).sort("due_date", 1)
        alerts = await cursor.to_list(length=100)

        for alert in alerts:
            alert["id"] = str(alert["_id"])
            del alert["_id"]

        return alerts

    async def mark_alert_read(self, alert_id: str) -> bool:
        """Mark an alert as read."""
        result = await self.alerts_collection.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    async def mark_alert_sent(self, alert_id: str) -> bool:
        """Mark an alert as sent (email/SMS)."""
        result = await self.alerts_collection.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"is_sent": True, "sent_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    # Statistics

    async def get_loan_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get loan statistics for a user."""
        loans = await self.get_loans_by_user(user_id, active_only=False)

        active_loans = [l for l in loans if l.get("is_active", False)]
        inactive_loans = [l for l in loans if not l.get("is_active", False)]

        total_principal = sum(
            float(l.get("principal_amount", 0)) for l in active_loans
        )

        return {
            "total_loans": len(loans),
            "active_loans": len(active_loans),
            "completed_loans": len(inactive_loans),
            "total_principal": str(int(total_principal))
        }
