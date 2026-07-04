"""Tests de JwtTokenService — BE-01."""

from datetime import UTC, datetime

import jwt
import pytest

from domain.entities.user import User
from domain.services.system_clock import SystemClock
from domain.services.token_service import JwtTokenService, TokenExpiredError
from domain.value_objects.role import Role
from infrastructure.persistence.in_memory.clock import InMemoryClock


@pytest.fixture
def sample_user() -> User:
    return User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan Pérez",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
    )


@pytest.fixture
def token_service() -> JwtTokenService:
    return JwtTokenService(
        secret="test-secret-key-at-least-32-bytes-long",
        algorithm="HS256",
        access_ttl_seconds=3600,
        refresh_ttl_seconds=2592000,
        clock=SystemClock(),
    )


def test_emit_access_token_contains_claims(
    token_service: JwtTokenService,
    sample_user: User,
) -> None:
    token = token_service.create_access_token(sample_user)
    payload = jwt.decode(
        token.value,
        "test-secret-key-at-least-32-bytes-long",
        algorithms=["HS256"],
    )
    assert payload["sub"] == "tech-1"
    assert payload["email"] == "juan@planta.com"
    assert payload["role"] == "technician"
    assert payload["plant_id"] == "plant-1"
    assert "iat" in payload
    assert "exp" in payload
    assert "jti" in payload


def test_decode_access_token_returns_payload(
    token_service: JwtTokenService,
    sample_user: User,
) -> None:
    token = token_service.create_access_token(sample_user)
    payload = token_service.decode_access_token(token.value)
    assert payload["sub"] == sample_user.id


def test_expired_access_token_raises(
    sample_user: User,
) -> None:
    clock = InMemoryClock(initial=datetime(2025, 1, 1, tzinfo=UTC))
    service = JwtTokenService(
        secret="test-secret-key-at-least-32-bytes-long",
        algorithm="HS256",
        access_ttl_seconds=60,
        refresh_ttl_seconds=3600,
        clock=clock,
    )
    token = service.create_access_token(sample_user)
    clock.set(datetime(2025, 1, 1, 0, 2, 0, tzinfo=UTC))
    with pytest.raises(TokenExpiredError):
        service.decode_access_token(token.value)


def test_refresh_token_has_longer_exp(
    token_service: JwtTokenService,
    sample_user: User,
) -> None:
    access = token_service.create_access_token(sample_user)
    refresh = token_service.create_refresh_token(sample_user)
    assert refresh.exp > access.exp
