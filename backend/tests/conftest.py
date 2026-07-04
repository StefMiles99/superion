"""Fixtures compartidas — BE-00/BE-01."""

import asyncio

import pytest

from infrastructure.config import Settings
from infrastructure.factories import ensure_build_live_started, reset_auth_state, reset_settings
from interface.main import create_app

# Password de fixtures in-memory documentada para tests E2E e integración.
FIXTURE_PASSWORD = "test1234"
TEST_JWT_SECRET = "test-secret-key-at-least-32-bytes-long"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        JWT_SECRET=TEST_JWT_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
    )


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture(autouse=True)
def _reset_factories() -> None:
    """Evita estado compartido entre tests."""
    reset_settings()
    asyncio.run(reset_auth_state())
    asyncio.run(ensure_build_live_started())
    yield
    reset_settings()
    asyncio.run(reset_auth_state())
