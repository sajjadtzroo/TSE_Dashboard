"""
Alembic environment configuration.
Reads DATABASE_URL from config.settings and uses project models for autogenerate.
"""
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# Ensure project root is on sys.path so imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config.settings import DATABASE_URL
from database.models import Base

# Alembic Config object
config = context.config

# Override sqlalchemy.url from application config
# Escape '%' for configparser interpolation (e.g. URL-encoded passwords)
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))

# Set up loggers from ini file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Model metadata for autogenerate
target_metadata = Base.metadata


def _render_item(type_, obj, autogen_context):
    """Custom render for pgvector Vector column type."""
    if type_ == "type" and hasattr(obj, "__class__") and obj.__class__.__name__ == "Vector":
        autogen_context.imports.add("from pgvector.sqlalchemy import Vector")
        dim = getattr(obj, "dim", None)
        return f"Vector({dim})" if dim else "Vector()"
    return False


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL without DB connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_item=_render_item,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (with live DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_item=_render_item,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
