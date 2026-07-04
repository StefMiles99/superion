"""Tests de GetMeUseCase — BE-01."""

import pytest

from application.use_cases.auth.get_me import GetMeUseCase
from domain.exceptions import NotFoundError
from infrastructure.persistence.in_memory.user_repository import InMemoryUserRepository

FIXTURE_PASSWORD = "test1234"


@pytest.fixture
def user_repo() -> InMemoryUserRepository:
    return InMemoryUserRepository.with_fixtures(password=FIXTURE_PASSWORD, rounds=4)


@pytest.fixture
def get_me_use_case(user_repo: InMemoryUserRepository) -> GetMeUseCase:
    return GetMeUseCase(users=user_repo)


async def test_get_me_returns_user_data(get_me_use_case: GetMeUseCase) -> None:
    result = await get_me_use_case.execute("tech-1")
    assert result.id == "tech-1"
    assert result.email == "juan@planta.com"
    assert result.full_name == "Juan Pérez"
    assert result.role == "technician"
    assert result.plant_id == "plant-1"


async def test_get_me_raises_when_user_missing(get_me_use_case: GetMeUseCase) -> None:
    with pytest.raises(NotFoundError):
        await get_me_use_case.execute("missing-user")
