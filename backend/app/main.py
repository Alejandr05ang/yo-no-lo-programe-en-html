import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker
from starlette.responses import JSONResponse

from app.admin.routes import router as admin_router
from app.auth.firebase import FirebaseVerifier
from app.auth.routes import router as auth_router
from app.catalog.routes import router as catalog_router
from app.cohorts.routes import router as cohorts_router
from app.cohorts.service import JoinAttemptLimiter
from app.core.config import Settings
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestSafetyMiddleware
from app.db.session import create_database
from app.demo.routes import router as demo_router
from app.instructor.routes import router as instructor_router
from app.profile.routes import router as profile_router
from app.progress.routes import router as progress_router


def create_app(settings: Settings | None = None) -> FastAPI:
    configure_logging()
    settings = settings or Settings()
    engine = create_database(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        if engine is not None:
            await engine.dispose()

    app = FastAPI(title="Tutorías de Verano", lifespan=lifespan)
    app.state.settings = settings
    app.state.firebase_verifier = FirebaseVerifier(settings)
    app.state.join_attempt_limiter = JoinAttemptLimiter()
    app.state.engine = engine
    app.state.session_factory = (
        async_sessionmaker(engine, expire_on_commit=False) if engine is not None else None
    )
    install_error_handlers(app)
    app.include_router(auth_router)
    app.include_router(profile_router)
    app.include_router(cohorts_router)
    app.include_router(catalog_router)
    app.include_router(admin_router)
    app.include_router(progress_router)
    app.include_router(demo_router)
    app.include_router(instructor_router)
    app.add_middleware(RequestSafetyMiddleware, settings=settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.app_origin],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health")
    async def health():
        if engine is None:
            return {"status": "ok", "database": "not_configured"}
        try:
            async with asyncio.timeout(3), engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
        except Exception:
            return JSONResponse({"status": "degraded", "database": "unavailable"}, status_code=503)
        return {"status": "ok", "database": "connected"}

    return app


app = create_app()
