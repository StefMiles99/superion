"""Tests de RefreshUseCase — BE-01."""

from datetime import UTC, datetime

import pytest

from application.dto.auth import LoginInput, RefreshInput
from application.use_cases.auth.login import LoginUseCase
from application.use_cases.auth.refresh import RefreshUseCase
from domain.exceptions import UnauthorizedError
from domain.services.password_hasher import BcryptPasswordHasher
from domain.services.system_clock import SystemClock
from domain.services.token_service import JwtTokenService
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.token_blacklist import InMemoryTokenBlacklist
from infrastructure.persistence.in_memory.user_repository import InMemoryUserRepository

TEST_SECRET = "test-secret-key-at-least-32-bytes-long"
FIXTURE_PASSWORD = "test1234"


def _build_auth_stack(clock=None):
    clock = clock or SystemClock()
    user_repo = InMemoryUserRepository.with_fixtures(password=FIXTURE_PASSWORD, rounds=4)
    tokens = JwtTokenService(
        secret=TEST_SECRET,
        algorithm="HS256",
        access_ttl_seconds=3600,
        refresh_ttl_seconds=2592000,
        clock=clock,
    )
    blacklist = InMemoryTokenBlacklist()
    login = LoginUseCase(
        users=user_repo,
        hasher=BcryptPasswordHasher(rounds=4),
        tokens=tokens,
        blacklist=blacklist,
    )
    refresh = RefreshUseCase(users=user_repo, tokens=tokens, blacklist=blacklist)
    return login, refresh, blacklist, tokens


async def test_refresh_with_valid_token() -> None:
    login, refresh, _, _ = _build_auth_stack()
    logged_in = await login.execute(LoginInput(email="juan@planta.com", password=FIXTURE_PASSWORD))
    result = await refresh.execute(RefreshInput(refresh_token=logged_in.refresh_token))
    assert result.access_token
    assert result.refresh_token
    assert result.access_token != logged_in.access_token


async def test_refresh_with_expired_token() -> None:
    clock = InMemoryClock(initial=datetime(2025, 1, 1, tzinfo=UTC))
    login, refresh, _, _ = _build_auth_stack(clock=clock)
    logged_in = await login.execute(LoginInput(email="juan@planta.com", password=FIXTURE_PASSWORD))
    clock.set(datetime(2025, 2, 1, tzinfo=UTC))
    with pytest.raises(UnauthorizedError) as exc_info:
        await refresh.execute(RefreshInput(refresh_token=logged_in.refresh_token))
    assert exc_info.value.code == "TOKEN_EXPIRED"


async def test_refresh_with_revoked_token() -> None:
    login, refresh, blacklist, tokens = _build_auth_stack()
    logged_in = await login.execute(LoginInput(email="juan@planta.com", password=FIXTURE_PASSWORD))
    payload = tokens.decode_refresh_token(logged_in.refresh_token)
    await blacklist.revoke(payload["jti"])
    with pytest.raises(UnauthorizedError) as exc_info:
        await refresh.execute(RefreshInput(refresh_token=logged_in.refresh_token))
    assert exc_info.value.code == "UNAUTHORIZED"
