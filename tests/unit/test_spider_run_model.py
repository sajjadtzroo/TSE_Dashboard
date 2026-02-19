"""
Unit tests for SpiderRun database model
Tests spider execution tracking functionality
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, SpiderRun


@pytest.fixture
def db_session():
    """Create in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    session.close()


@pytest.fixture
def sample_spider_run():
    """Sample spider run data"""
    now = datetime.now(UTC)
    return {
        "spider_name": "market_watch",
        "start_time": now,
        "end_time": now + timedelta(seconds=45),
        "duration_seconds": 45,
        "status": "success",
        "items_scraped": 150,
        "items_dropped": 2,
        "error_count": 0,
        "error_message": None,
        "log_file": "/logs/scrapy/market_watch_2025-01-15.log",
        "run_metadata": '{"args": {"date": "2025-01-15"}, "config": {"retry": 3}}',
    }


class TestSpiderRunModel:
    """Test suite for SpiderRun model"""

    def test_create_spider_run(self, db_session, sample_spider_run):
        """Test creating a new spider run record"""
        run = SpiderRun(**sample_spider_run)
        db_session.add(run)
        db_session.commit()

        assert run.id is not None
        assert run.spider_name == "market_watch"
        assert run.status == "success"
        assert run.items_scraped == 150
        assert run.created_at is not None

    def test_running_spider(self, db_session):
        """Test spider run in 'running' state"""
        now = datetime.now(UTC)
        run = SpiderRun(
            spider_name="historical_prices",
            start_time=now,
            end_time=None,  # Still running
            duration_seconds=None,
            status="running",
            items_scraped=0,
        )
        db_session.add(run)
        db_session.commit()

        assert run.status == "running"
        assert run.end_time is None
        assert run.duration_seconds is None

    def test_failed_spider_run(self, db_session):
        """Test spider run that failed with error"""
        now = datetime.now(UTC)
        run = SpiderRun(
            spider_name="codal",
            start_time=now,
            end_time=now + timedelta(seconds=10),
            duration_seconds=10,
            status="failed",
            items_scraped=5,
            error_count=3,
            error_message="Connection timeout to TSETMC API",
        )
        db_session.add(run)
        db_session.commit()

        assert run.status == "failed"
        assert run.error_count == 3
        assert "timeout" in run.error_message.lower()

    def test_multiple_spider_runs(self, db_session):
        """Test tracking multiple spider runs"""
        now = datetime.now(UTC)

        runs = [
            SpiderRun(
                spider_name="market_watch",
                start_time=now - timedelta(hours=2),
                end_time=now - timedelta(hours=2) + timedelta(seconds=30),
                duration_seconds=30,
                status="success",
                items_scraped=100,
            ),
            SpiderRun(
                spider_name="market_watch",
                start_time=now - timedelta(hours=1),
                end_time=now - timedelta(hours=1) + timedelta(seconds=32),
                duration_seconds=32,
                status="success",
                items_scraped=105,
            ),
            SpiderRun(
                spider_name="etf_nav",
                start_time=now,
                end_time=now + timedelta(seconds=15),
                duration_seconds=15,
                status="success",
                items_scraped=50,
            ),
        ]

        for run in runs:
            db_session.add(run)
        db_session.commit()

        # Query all runs
        all_runs = db_session.query(SpiderRun).all()
        assert len(all_runs) == 3

        # Query by spider name
        market_runs = (
            db_session.query(SpiderRun).filter_by(spider_name="market_watch").all()
        )
        assert len(market_runs) == 2

    def test_spider_run_with_metadata(self, db_session):
        """Test storing JSON metadata with spider run"""
        import json

        now = datetime.now(UTC)
        run_metadata = {
            "args": {"start_date": "2025-01-01", "end_date": "2025-01-15"},
            "config": {"concurrent_requests": 16, "retry_times": 3},
        }

        run = SpiderRun(
            spider_name="history_backfill",
            start_time=now,
            end_time=now + timedelta(minutes=5),
            duration_seconds=300,
            status="success",
            items_scraped=5000,
            run_metadata=json.dumps(run_metadata),
        )
        db_session.add(run)
        db_session.commit()

        # Retrieve and parse metadata
        retrieved = (
            db_session.query(SpiderRun)
            .filter_by(spider_name="history_backfill")
            .first()
        )

        parsed_metadata = json.loads(retrieved.run_metadata)
        assert parsed_metadata["args"]["start_date"] == "2025-01-01"
        assert parsed_metadata["config"]["concurrent_requests"] == 16

    def test_query_by_status(self, db_session):
        """Test querying spider runs by status"""
        now = datetime.now(UTC)

        runs = [
            SpiderRun(
                spider_name="spider1",
                start_time=now,
                status="success",
                items_scraped=10,
            ),
            SpiderRun(
                spider_name="spider2",
                start_time=now,
                status="failed",
                items_scraped=5,
                error_count=2,
            ),
            SpiderRun(
                spider_name="spider3",
                start_time=now,
                status="success",
                items_scraped=20,
            ),
            SpiderRun(
                spider_name="spider4", start_time=now, status="running", items_scraped=0
            ),
        ]

        for run in runs:
            db_session.add(run)
        db_session.commit()

        # Query successful runs
        successful = db_session.query(SpiderRun).filter_by(status="success").all()
        assert len(successful) == 2

        # Query failed runs
        failed = db_session.query(SpiderRun).filter_by(status="failed").all()
        assert len(failed) == 1
        assert failed[0].error_count == 2

    def test_query_by_time_range(self, db_session):
        """Test querying spider runs within time range"""
        now = datetime.now(UTC)

        runs = [
            SpiderRun(
                spider_name="spider1",
                start_time=now - timedelta(days=3),
                status="success",
                items_scraped=10,
            ),
            SpiderRun(
                spider_name="spider2",
                start_time=now - timedelta(days=1),
                status="success",
                items_scraped=20,
            ),
            SpiderRun(
                spider_name="spider3",
                start_time=now,
                status="success",
                items_scraped=30,
            ),
        ]

        for run in runs:
            db_session.add(run)
        db_session.commit()

        # Query runs from last 2 days
        cutoff = now - timedelta(days=2)
        # Replace timezone info for SQLite compatibility
        cutoff_naive = cutoff.replace(tzinfo=None)
        recent_runs = (
            db_session.query(SpiderRun)
            .filter(SpiderRun.start_time >= cutoff_naive)
            .all()
        )

        assert len(recent_runs) == 2

    def test_spider_run_repr(self, db_session):
        """Test string representation"""
        now = datetime.now(UTC)
        run = SpiderRun(
            spider_name="test_spider",
            start_time=now,
            status="success",
            items_scraped=42,
        )
        db_session.add(run)
        db_session.commit()

        repr_str = repr(run)
        assert "SpiderRun" in repr_str
        assert "test_spider" in repr_str
        assert "success" in repr_str

    def test_items_dropped_tracking(self, db_session):
        """Test tracking items dropped by pipeline"""
        now = datetime.now(UTC)
        run = SpiderRun(
            spider_name="market_watch",
            start_time=now,
            end_time=now + timedelta(seconds=30),
            duration_seconds=30,
            status="success",
            items_scraped=100,
            items_dropped=5,  # 5 items were dropped (duplicates, validation failures, etc.)
        )
        db_session.add(run)
        db_session.commit()

        assert run.items_scraped == 100
        assert run.items_dropped == 5

    def test_cancelled_spider_run(self, db_session):
        """Test spider run that was cancelled"""
        now = datetime.now(UTC)
        run = SpiderRun(
            spider_name="long_running_spider",
            start_time=now,
            end_time=now + timedelta(seconds=120),
            duration_seconds=120,
            status="cancelled",
            items_scraped=250,
            error_message="Spider cancelled by user",
        )
        db_session.add(run)
        db_session.commit()

        assert run.status == "cancelled"
        assert "cancelled" in run.error_message.lower()
        assert run.items_scraped == 250  # Partial results


class TestSpiderRunQueries:
    """Test common query patterns for spider runs"""

    def test_get_latest_run_per_spider(self, db_session):
        """Test getting the most recent run for each spider"""
        now = datetime.now(UTC)

        runs = [
            SpiderRun(
                spider_name="spider_a",
                start_time=now - timedelta(hours=2),
                status="success",
                items_scraped=10,
            ),
            SpiderRun(
                spider_name="spider_a",
                start_time=now - timedelta(hours=1),
                status="success",
                items_scraped=15,
            ),
            SpiderRun(
                spider_name="spider_a",
                start_time=now,
                status="success",
                items_scraped=20,
            ),
            SpiderRun(
                spider_name="spider_b",
                start_time=now - timedelta(hours=1),
                status="failed",
                items_scraped=5,
            ),
            SpiderRun(
                spider_name="spider_b",
                start_time=now,
                status="success",
                items_scraped=10,
            ),
        ]

        for run in runs:
            db_session.add(run)
        db_session.commit()

        # Get latest run for spider_a
        latest_a = (
            db_session.query(SpiderRun)
            .filter_by(spider_name="spider_a")
            .order_by(SpiderRun.start_time.desc())
            .first()
        )

        assert latest_a.items_scraped == 20
        # SQLite doesn't preserve timezone info, so compare times without timezone
        assert latest_a.start_time.replace(tzinfo=UTC) >= now - timedelta(seconds=1)

    def test_calculate_success_rate(self, db_session):
        """Test calculating spider success rate"""
        now = datetime.now(UTC)

        runs = [
            SpiderRun(
                spider_name="spider",
                start_time=now - timedelta(hours=5),
                status="success",
                items_scraped=10,
            ),
            SpiderRun(
                spider_name="spider",
                start_time=now - timedelta(hours=4),
                status="success",
                items_scraped=10,
            ),
            SpiderRun(
                spider_name="spider",
                start_time=now - timedelta(hours=3),
                status="failed",
                items_scraped=0,
            ),
            SpiderRun(
                spider_name="spider",
                start_time=now - timedelta(hours=2),
                status="success",
                items_scraped=10,
            ),
            SpiderRun(
                spider_name="spider",
                start_time=now - timedelta(hours=1),
                status="failed",
                items_scraped=0,
            ),
        ]

        for run in runs:
            db_session.add(run)
        db_session.commit()

        all_runs = db_session.query(SpiderRun).filter_by(spider_name="spider").all()
        successful = [r for r in all_runs if r.status == "success"]

        success_rate = len(successful) / len(all_runs)
        assert success_rate == 0.6  # 3 out of 5 successful
