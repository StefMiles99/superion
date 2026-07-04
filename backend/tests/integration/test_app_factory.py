"""Tests de factory create_app — BE-00."""

from fastapi import FastAPI

from infrastructure.config import Settings
from interface.main import create_app


def test_create_app_returns_fastapi_instance() -> None:
    settings = Settings()
    app = create_app(settings)
    assert isinstance(app, FastAPI)


def test_create_app_has_health_routes() -> None:
    settings = Settings()
    app = create_app(settings)
    paths = app.openapi()["paths"]
    assert "/health" in paths
    assert "/ready" in paths
