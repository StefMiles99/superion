"""Tests de LoginUseCase — BE-01."""

import pytest

from application.dto.auth import LoginInput
from application.use_cases.auth.login import LoginUseCase
from domain.exceptions import UnauthorizedError
from domain.services.password_hasher import BcryptPasswordHasher
from domain.services.system_clock import SystemClock
from domain.services.token_service import JwtTokenService
from infrastructure.persistence.in_memory.token_blacklist import InMemoryTokenBlacklist
from infrastructure.persistence.in_memory.user_repository import InMemoryUserRepository

TEST_SECRET = "test-secret-key-at-least-32-bytes-long"
FIXTURE_PASSWORD = "test1234"


@pytest.fixture
def user_repo() -> InMemoryUserRepository:
    repo = InMemoryUserRepository.with_fixtures(password=FIXTURE_PASSWORD, rounds=4)
    return repo


@pytest.fixture
def login_use_case(user_repo: InMemoryUserRepository) -> LoginUseCase:
    return LoginUseCase(
        users=user_repo,
        hasher=BcryptPasswordHasher(rounds=4),
        tokens=JwtTokenService(
            secret=TEST_SECRET,
            algorithm="HS256",
            access_ttl_seconds=3600,
            refresh_ttl_seconds=2592000,
            clock=SystemClock(),
        ),
        blacklist=InMemoryTokenBlacklist(),
    )


async def test_login_with_valid_credentials(
    login_use_case: LoginUseCase,
) -> None:
    result = await login_use_case.execute(
        LoginInput(email="juan@planta.com", password=FIXTURE_PASSWORD),
    )
    assert result.access_token
    assert result.refresh_token
    assert result.expires_in == 3600
    assert result.user.email == "juan@planta.com"
    assert result.user.role == "technician"
    assert result.user.plant_id == "plant-1"


async def test_login_with_invalid_password(login_use_case: LoginUseCase) -> None:
    with pytest.raises(UnauthorizedError) as exc_info:
        await login_use_case.execute(LoginInput(email="juan@planta.com", password="WRONG"))
    assert exc_info.value.code == "INVALID_CREDENTIALS"


async def test_login_with_unknown_email(login_use_case: LoginUseCase) -> None:
    with pytest.raises(UnauthorizedError) as exc_info:
        await login_use_case.execute(
            LoginInput(email="unknown@planta.com", password=FIXTURE_PASSWORD),
        )
    assert exc_info.value.code == "INVALID_CREDENTIALS"


async def test_login_with_blocked_user(user_repo: InMemoryUserRepository) -> None:
    use_case = LoginUseCase(
        users=user_repo,
        hasher=BcryptPasswordHasher(rounds=4),
        tokens=JwtTokenService(
            secret=TEST_SECRET,
            algorithm="HS256",
            access_ttl_seconds=3600,
            refresh_ttl_seconds=2592000,
            clock=SystemClock(),
        ),
        blacklist=InMemoryTokenBlacklist(),
    )
    with pytest.raises(UnauthorizedError) as exc_info:
        await use_case.execute(LoginInput(email="blocked@planta.com", password=FIXTURE_PASSWORD))
    assert exc_info.value.code == "INVALID_CREDENTIALS"
