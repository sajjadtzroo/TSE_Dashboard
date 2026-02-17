"""
Initialize Authentication System
Creates database indexes and initial admin user.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.modules.auth.models import User, UserRole
from app.modules.auth.password import hash_password
from app.modules.auth.repository import AuthRepository


async def init_auth():
    """Initialize authentication system."""
    print("🔐 Initializing Authentication System...")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    try:
        # Create indexes
        repository = AuthRepository(db)
        await repository.ensure_indexes()
        print("✅ Database indexes created")

        # Check if admin user exists
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        existing_admin = await repository.get_user_by_username(admin_username)

        if existing_admin:
            print(f"ℹ️  Admin user '{admin_username}' already exists")
        else:
            # Create admin user
            admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
            admin_password = os.getenv("ADMIN_PASSWORD", "AdminPass123!")

            if admin_password == "AdminPass123!":
                print("⚠️  WARNING: Using default admin password!")
                print("   Set ADMIN_PASSWORD environment variable for production")

            admin_user = User(
                username=admin_username,
                email=admin_email,
                hashed_password=hash_password(admin_password),
                role=UserRole.ADMIN,
                is_active=True,
            )

            created_user = await repository.create_user(admin_user)
            print(f"✅ Admin user created: {created_user.username}")
            print(f"   Email: {admin_email}")
            print(f"   Password: {'(from env)' if os.getenv('ADMIN_PASSWORD') else admin_password}")

        print("\n🎉 Authentication system initialized successfully!")

    except Exception as e:
        print(f"❌ Error initializing authentication: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(init_auth())
