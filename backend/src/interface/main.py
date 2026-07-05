"""Factory de aplicación FastAPI — BE-00/BE-08."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from application.dto.error_envelope import COMMON_ERROR_RESPONSES
from infrastructure.config import Settings
from infrastructure.factories import ensure_build_live_started, set_settings
from infrastructure.persistence.supabase.bootstrap import maybe_bootstrap_on_startup
from infrastructure.observability.logging import configure_logging
from interface.http.exception_handlers import register_exception_handlers
from interface.http.middleware.cors import build_cors_middleware
from interface.http.middleware.correlation import CorrelationMiddleware
from interface.http.middleware.logging import LoggingMiddleware
from interface.http.middleware.rate_limit import RateLimitMiddleware
from interface.http.middleware.security_headers import SecurityHeadersMiddleware
from interface.http.routers import (
    audit,
    auth,
    elevenlabs_tools,
    health,
    manuals,
    metrics,
    mock_storage,
    openapi,
    photos,
    reports,
    sessions,
    voice,
    work_orders,
)
from interface.http.routers.admin import elevenlabs as admin_elevenlabs
from interface.http.routers.webhooks import elevenlabs as elevenlabs_webhook
from interface.ws.handlers import router as ws_router


def create_app(settings: Settings | None = None) -> FastAPI:
    """Crea instancia FastAPI con middleware, routers y handlers."""
    cfg = settings or Settings()
    set_settings(cfg)
    configure_logging(cfg.LOG_LEVEL)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        await maybe_bootstrap_on_startup(cfg)
        await ensure_build_live_started()
        yield

    app = FastAPI(
        title="SUPERION API",
        version=cfg.APP_VERSION,
        lifespan=lifespan,
        responses=COMMON_ERROR_RESPONSES,
    )

    if cfg.SECURITY_HEADERS:
        app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(CorrelationMiddleware)

    register_exception_handlers(app)
    app.include_router(health.router)
    app.include_router(openapi.router)
    app.include_router(metrics.router)
    app.include_router(audit.router)
    app.include_router(auth.router)
    app.include_router(work_orders.router)
    app.include_router(sessions.router)
    app.include_router(voice.router)
    app.include_router(reports.router)
    app.include_router(photos.router)
    app.include_router(manuals.router)
    if cfg.STORAGE == "memory":
        app.include_router(mock_storage.router)
    app.include_router(elevenlabs_webhook.router)
    app.include_router(elevenlabs_tools.router)
    app.include_router(admin_elevenlabs.router)
    app.include_router(ws_router)

    return build_cors_middleware(app, allowed_origins=cfg.cors_origin_list())


app = create_app()
