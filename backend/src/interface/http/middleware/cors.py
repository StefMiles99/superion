"""CORS allowlist — BE-08 / Cloud Run demo."""

from __future__ import annotations

from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp


def build_cors_middleware(app: ASGIApp, *, allowed_origins: list[str]) -> ASGIApp:
    """Envuelve la app con CORS si hay orígenes configurados."""
    if not allowed_origins:
        return app
    return CORSMiddleware(
        app,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-Id"],
    )
