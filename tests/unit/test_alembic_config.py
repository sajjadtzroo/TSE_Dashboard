"""
Tests for Issue 5: Alembic migration configuration.
Verifies alembic.ini, env.py, versions directory, and migration files exist.
"""
import pytest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class TestAlembicConfiguration:
    """Verify Alembic is properly configured."""

    def test_alembic_ini_exists(self):
        assert (PROJECT_ROOT / "alembic.ini").is_file()

    def test_alembic_env_py_exists(self):
        assert (PROJECT_ROOT / "alembic" / "env.py").is_file()

    def test_versions_directory_exists(self):
        assert (PROJECT_ROOT / "alembic" / "versions").is_dir()

    def test_at_least_one_migration(self):
        versions_dir = PROJECT_ROOT / "alembic" / "versions"
        py_files = list(versions_dir.glob("*.py"))
        # Filter out __pycache__
        py_files = [f for f in py_files if f.name != "__init__.py"]
        assert len(py_files) >= 1, "Expected at least one migration file"

    def test_env_imports_base(self):
        env_py = (PROJECT_ROOT / "alembic" / "env.py").read_text()
        assert "from database.models import Base" in env_py

    def test_env_reads_database_url(self):
        env_py = (PROJECT_ROOT / "alembic" / "env.py").read_text()
        assert "DATABASE_URL" in env_py

    def test_env_sets_target_metadata(self):
        env_py = (PROJECT_ROOT / "alembic" / "env.py").read_text()
        assert "target_metadata = Base.metadata" in env_py

    def test_baseline_migration_exists(self):
        baseline = PROJECT_ROOT / "alembic" / "versions" / "001_initial_baseline.py"
        assert baseline.is_file()

    def test_index_migration_exists(self):
        indexes = PROJECT_ROOT / "alembic" / "versions" / "002_add_indexes.py"
        assert indexes.is_file()
