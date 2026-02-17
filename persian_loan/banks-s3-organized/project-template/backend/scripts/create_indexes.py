"""
Create Database Indexes
Applies all database indexes for optimal query performance.
Run this script to create indexes on an existing database.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.modules.auth.repository import AuthRepository
from app.modules.banks.repository import BankRepository


async def create_all_indexes():
    """Create all database indexes."""
    print("🔧 Creating Database Indexes...")
    print(f"Database: {settings.database_name}")
    print(f"MongoDB URL: {settings.mongodb_url.split('@')[-1]}")  # Hide credentials
    print()

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    try:
        # Test connection
        await db.command("ping")
        print("✅ Connected to MongoDB")
        print()

        # Create authentication indexes
        print("📝 Creating authentication indexes...")
        auth_repo = AuthRepository(db)
        await auth_repo.ensure_indexes()
        print()

        # Create banks collection indexes
        print("📝 Creating banks collection indexes...")
        banks_repo = BankRepository(db)
        await banks_repo.ensure_indexes()
        print()

        # Get index statistics
        print("📊 Index Statistics:")
        print()

        # List all indexes
        print("🔍 Users collection indexes:")
        user_indexes = await db.users.list_indexes().to_list(length=100)
        for idx in user_indexes:
            print(f"  - {idx['name']}: {idx.get('key', {})}")
        print()

        print("🔍 Refresh tokens collection indexes:")
        token_indexes = await db.refresh_tokens.list_indexes().to_list(length=100)
        for idx in token_indexes:
            print(f"  - {idx['name']}: {idx.get('key', {})}")
        print()

        print("🔍 Banks collection indexes:")
        bank_indexes = await banks_repo.get_index_stats()
        for idx in bank_indexes:
            print(f"  - {idx['name']}: {idx.get('key', {})}")
        print()

        # Get collection stats
        banks_stats = await db.command("collstats", "banks")
        print(f"📈 Banks collection stats:")
        print(f"  - Documents: {banks_stats.get('count', 0):,}")
        print(f"  - Size: {banks_stats.get('size', 0) / 1024 / 1024:.2f} MB")
        print(f"  - Indexes: {banks_stats.get('nindexes', 0)}")
        print(f"  - Index size: {banks_stats.get('totalIndexSize', 0) / 1024:.2f} KB")
        print()

        print("🎉 All indexes created successfully!")
        print()
        print("💡 Performance Tips:")
        print("  - Indexes are automatically used by MongoDB for matching queries")
        print("  - Use .explain() in MongoDB shell to verify index usage")
        print("  - Monitor slow queries with MongoDB profiler")
        print("  - Indexes are rebuilt automatically on index creation")

    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
        raise
    finally:
        client.close()


async def drop_indexes():
    """Drop all non-_id indexes (use with caution!)."""
    print("⚠️  WARNING: Dropping all indexes (except _id)...")
    response = input("Are you sure? Type 'yes' to confirm: ")

    if response.lower() != "yes":
        print("❌ Aborted")
        return

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    try:
        # Drop indexes (except _id which is required)
        await db.users.drop_indexes()
        await db.refresh_tokens.drop_indexes()
        await db.banks.drop_indexes()

        print("✅ All indexes dropped")
    except Exception as e:
        print(f"❌ Error dropping indexes: {e}")
        raise
    finally:
        client.close()


async def analyze_queries():
    """Analyze query performance."""
    print("📊 Analyzing Query Performance...")

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    try:
        # Enable profiler for slow queries
        await db.command("profile", 2, slowms=100)  # Log queries slower than 100ms
        print("✅ Profiler enabled (logging queries > 100ms)")
        print()

        # Sample queries
        print("🔍 Sample Queries:")
        print()

        # Query 1: Find bank by ID
        print("1. Find bank by ID:")
        result = await db.banks.find_one({"id": "mellat"})
        print(f"   Result: {'Found' if result else 'Not found'}")

        # Query 2: Find banks by category
        print("2. Find banks by category:")
        cursor = db.banks.find({"category": "traditional-banks"})
        count = await cursor.count()
        print(f"   Result: {count} banks")

        # Query 3: Find loans without guarantor
        print("3. Find loans without guarantor:")
        cursor = db.banks.find({"loanTypes.guarantor": False})
        count = await cursor.count()
        print(f"   Result: {count} banks with such loans")

        print()
        print("💡 Check system.profile collection for slow query logs")

    except Exception as e:
        print(f"❌ Error analyzing queries: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "drop":
            asyncio.run(drop_indexes())
        elif command == "analyze":
            asyncio.run(analyze_queries())
        else:
            print(f"Unknown command: {command}")
            print("Usage:")
            print("  python create_indexes.py        # Create indexes")
            print("  python create_indexes.py drop   # Drop indexes")
            print("  python create_indexes.py analyze # Analyze queries")
    else:
        asyncio.run(create_all_indexes())
