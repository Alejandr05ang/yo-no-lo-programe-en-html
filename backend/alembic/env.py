import asyncio
from logging.config import fileConfig

from alembic import context
from app.core.config import Settings
from app.db.models import Base
from app.db.session import create_database

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def include_name(name, type_, parent_names):
    return name == "app" if type_ == "schema" else True


def configure(**kwargs):
    context.configure(
        target_metadata=Base.metadata,
        include_schemas=True,
        include_name=include_name,
        version_table_schema="app",
        compare_type=True,
        **kwargs,
    )


def run_offline():
    # Compilation never needs a real connection string or credentials.
    configure(dialect_name="postgresql", literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_on_connection(connection):
    configure(connection=connection)
    with context.begin_transaction():
        context.run_migrations()


async def run_online():
    engine = create_database(Settings())
    if engine is None:
        raise RuntimeError("DATABASE_URL is required; no database changes were attempted")
    try:
        async with engine.connect() as connection:
            await connection.run_sync(run_on_connection)
    finally:
        await engine.dispose()


if context.is_offline_mode():
    run_offline()
else:
    asyncio.run(run_online())
