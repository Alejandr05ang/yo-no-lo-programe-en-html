from dataclasses import dataclass

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.errors import ApiError
from app.main import create_app


@dataclass
class AuthHarness:
    client: httpx.AsyncClient
    sessions: async_sessionmaker
    identities: dict
    app: object


@pytest_asyncio.fixture
async def auth_harness(tmp_path):
    from app.auth.firebase import get_token_verifier
    from app.db.models import (
        AdminAllowlist,
        AuditLog,
        Base,
        Challenge,
        ChallengeOverride,
        Cohort,
        CohortMembership,
        CohortState,
        FeatureFlag,
        Progress,
        SessionCatalog,
        Submission,
        User,
    )

    engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
        execution_options={"schema_translate_map": {"app": None}},
    )
    
    # Remove Postgres specific server_default for sqlite testing and enable autoincrement
    AuditLog.__table__.c.id.server_default = None
    AuditLog.__table__.c.id.autoincrement = True
    
    async with engine.begin() as connection:
        await connection.run_sync(
            lambda conn: Base.metadata.create_all(
                conn,
                tables=[
                    User.__table__,
                    AdminAllowlist.__table__,
                    Cohort.__table__,
                    CohortMembership.__table__,
                    SessionCatalog.__table__,
                    Challenge.__table__,
                    CohortState.__table__,
                    ChallengeOverride.__table__,
                    Progress.__table__,
                    Submission.__table__,
                    FeatureFlag.__table__,
                    AuditLog.__table__,
                ],
            )
        )
    factory = async_sessionmaker(engine, expire_on_commit=False)
    app = create_app(Settings(_env_file=None, firebase_project_id=None, database_url=None))
    app.state.session_factory = factory
    identities = {}

    class TestVerifier:
        async def verify(self, token):
            identity = identities.get(token)
            if identity is None:
                raise ApiError(401, "INVALID_TOKEN", "La sesión no es válida.")
            if isinstance(identity, Exception):
                raise identity
            return identity

    app.dependency_overrides[get_token_verifier] = lambda: TestVerifier()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield AuthHarness(c, factory, identities, app)
    await engine.dispose()
