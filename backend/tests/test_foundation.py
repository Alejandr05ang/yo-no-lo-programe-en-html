import importlib.util

import httpx
import pytest

from app.core.config import Settings
from app.main import create_app


def test_application_factory_exists():
    assert importlib.util.find_spec("app.main") is not None, "The API factory is missing"


@pytest.mark.asyncio
async def test_health_starts_without_secrets():
    app = create_app(Settings(_env_file=None, database_url=None, firebase_project_id=None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        response = await c.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "not_configured"}


async def test_cors_is_exact_and_does_not_trust_other_origins():
    app = create_app(Settings(_env_file=None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        allowed = await c.get("/health", headers={"Origin": "http://localhost:5173"})
        denied = await c.get("/health", headers={"Origin": "https://evil.invalid"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in denied.headers


@pytest.mark.parametrize("origin", ["*", "https://example.org/path", "null", "https://a,b"])
def test_unsafe_cors_configuration_is_rejected(origin):
    with pytest.raises(ValueError):
        Settings(_env_file=None, app_origin=origin)


async def test_body_limits_apply_without_content_length():
    app = create_app(Settings(_env_file=None, max_request_bytes=32))

    async def chunks():
        yield b"a" * 20
        yield b"b" * 20

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        response = await c.post("/api/auth/bootstrap", content=chunks())
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "REQUEST_TOO_LARGE"


async def test_rate_limit_bounds_auth_abuse():
    app = create_app(Settings(_env_file=None, auth_rate_limit_per_minute=1))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        await c.post("/api/auth/bootstrap")
        response = await c.post("/api/auth/bootstrap")
    assert response.status_code == 429
    assert response.headers["retry-after"]
    assert response.json()["error"]["code"] == "RATE_LIMITED"


async def test_not_found_errors_and_logs_never_echo_request_secrets(caplog):
    import logging

    app = create_app(Settings(_env_file=None))
    caplog.set_level("INFO", logger="tutorias.http")
    logger = logging.getLogger("tutorias.http")
    logger.addHandler(caplog.handler)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        response = await c.get("/SECRET_SENTINEL?password=SECRET_SENTINEL")
    logger.removeHandler(caplog.handler)
    assert response.json() == {"error": {"code": "NOT_FOUND", "message": "Recurso no encontrado."}}
    assert "SECRET_SENTINEL" not in caplog.text
    assert '"status": 404' in caplog.text


async def test_validation_errors_do_not_echo_input():
    app = create_app(Settings(_env_file=None))

    @app.get("/test-validation/{value}")
    async def validate(value: int):
        return {"value": value}

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        response = await c.get("/test-validation/SECRET_SENTINEL")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "SECRET_SENTINEL" not in response.text


async def test_unhandled_errors_are_sanitized():
    app = create_app(Settings(_env_file=None))

    @app.get("/test-error")
    async def fail():
        raise ValueError("SECRET_SENTINEL")

    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.get("/test-error")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "SECRET_SENTINEL" not in response.text


def test_sqlite_cannot_be_configured_as_the_runtime_database():
    with pytest.raises(ValueError):
        create_app(Settings(_env_file=None, database_url="sqlite+aiosqlite:///runtime.db"))


def test_structured_request_logs_are_emitted_without_external_logging_configuration():
    import json
    import subprocess
    import sys

    probe = """
import asyncio
import httpx
from app.main import create_app
from app.core.config import Settings
async def run():
    app = create_app(Settings(_env_file=None, database_url=None))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as c:
        await c.get('/health?token=SECRET_SENTINEL')
asyncio.run(run())
"""
    result = subprocess.run(
        [sys.executable, "-c", probe], capture_output=True, text=True, timeout=20
    )
    assert result.returncode == 0
    assert "SECRET_SENTINEL" not in result.stderr
    records = [json.loads(line) for line in result.stderr.splitlines() if line.startswith("{")]
    assert len(records) == 1
    assert records[0]["route"] == "/health"
    assert records[0]["status"] == 200


def test_database_tls_validates_certificate_and_hostname(monkeypatch):
    import ssl

    from app.db import session as database

    observed = {}

    def capture_engine(url, **kwargs):
        observed.update(kwargs)
        return object()

    monkeypatch.setattr(database, "create_async_engine", capture_engine)
    database.create_database(
        Settings(_env_file=None, database_url="postgresql://u:p@db.invalid/postgres")
    )
    context = observed["connect_args"]["ssl"]
    assert context.check_hostname is True
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert observed["hide_parameters"] is True
    assert observed["echo"] is False


def test_blank_optional_ca_path_from_env_example_is_not_a_file_path():
    settings = Settings(_env_file=None, database_ssl_ca_file="")
    assert settings.database_ssl_ca_file is None


def test_env_example_with_database_url_keeps_verified_tls_without_custom_ca(tmp_path):
    import asyncio
    from pathlib import Path

    from app.db.session import create_database

    example = Path(__file__).resolve().parents[1] / ".env.example"
    contents = example.read_text(encoding="utf-8")
    contents = contents.replace(
        "DATABASE_URL=\n", "DATABASE_URL=postgresql://u:p@db.invalid/postgres\n"
    )
    path = tmp_path / ".env"
    path.write_text(contents, encoding="utf-8")
    settings = Settings(_env_file=path)
    engine = create_database(settings)
    assert settings.database_ssl_ca_file is None
    assert engine is not None
    assert engine.url.drivername == "postgresql+asyncpg"
    asyncio.run(engine.dispose())


async def test_transaction_rolls_back_on_handler_failure(auth_harness):
    from sqlalchemy import func, select

    from app.core.errors import ApiError
    from app.db.models import User
    from app.db.session import SessionDep

    h = auth_harness

    @h.app.post("/test-rollback")
    async def failing_transaction(session: SessionDep):
        session.add(User(firebase_uid="rollback", email="rollback@example.invalid"))
        await session.flush()
        raise ApiError(409, "ROLLBACK_TEST", "No se completó la operación.")

    response = await h.client.post("/test-rollback")
    assert response.status_code == 409
    async with h.sessions() as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 0


def test_interactive_docs_are_closed_in_production():
    """La documentacion lista admin incluido; no hace falta publicarla."""
    from app.core.config import Settings
    from app.main import create_app

    desarrollo = create_app(Settings(_env_file=None, app_env="development", database_url=None))
    assert desarrollo.docs_url == "/docs"
    assert desarrollo.openapi_url == "/openapi.json"

    produccion = create_app(Settings(_env_file=None, app_env="production", database_url=None))
    assert produccion.docs_url is None
    assert produccion.redoc_url is None
    assert produccion.openapi_url is None
