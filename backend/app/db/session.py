import ssl
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings
from app.core.errors import ApiError


def create_database(settings: Settings) -> AsyncEngine | None:
    if settings.database_url is None:
        return None
    try:
        url = make_url(settings.database_url.get_secret_value())
    except Exception:
        raise ValueError("DATABASE_URL must be a PostgreSQL URL") from None
    if url.drivername not in {"postgresql", "postgresql+asyncpg", "postgres"} or not url.host:
        raise ValueError("The runtime database must be PostgreSQL with asyncpg")
    if url.query:
        # TLS is controlled here, never weakened by connection string query parameters.
        raise ValueError("Remove URL query parameters; use DATABASE_SSL_CA_FILE for custom CA")
    context = ssl.create_default_context(cafile=settings.database_ssl_ca_file)
    return create_async_engine(
        url.set(drivername="postgresql+asyncpg"),
        connect_args={
            "ssl": context,
            "timeout": 5,
            "command_timeout": 10,
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_timeout=5,
        echo=False,
        hide_parameters=True,
    )


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    factory: async_sessionmaker[AsyncSession] | None = request.app.state.session_factory
    if factory is None:
        raise ApiError(503, "DATABASE_NOT_CONFIGURED", "El servicio todavía no está configurado.")
    async with factory() as session, session.begin():
        yield session


# Commit/rollback completes before a response is sent, including commit failures.
SessionDep = Annotated[AsyncSession, Depends(get_session, scope="function")]
