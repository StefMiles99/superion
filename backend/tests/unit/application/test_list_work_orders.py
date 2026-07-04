"""Tests de ListWorkOrdersUseCase — BE-02."""

import pytest

from application.use_cases.work_orders.list import ListWorkOrdersUseCase
from domain.entities.user import User
from domain.value_objects.role import Role
from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.procedure_template_repository import (
    InMemoryProcedureTemplateRepository,
)
from infrastructure.persistence.in_memory.user_repository import InMemoryUserRepository
from infrastructure.persistence.in_memory.work_order_repository import InMemoryWorkOrderRepository


@pytest.fixture
def juan() -> User:
    return User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan Pérez",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
    )


@pytest.fixture
def use_case() -> ListWorkOrdersUseCase:
    return ListWorkOrdersUseCase(
        work_orders=InMemoryWorkOrderRepository.with_fixtures(),
        assets=InMemoryAssetRepository.with_fixtures(),
        templates=InMemoryProcedureTemplateRepository.with_fixtures(),
        users=InMemoryUserRepository.with_fixtures(password="test1234", rounds=4),
    )


async def test_list_filters_by_assigned_to(juan: User, use_case: ListWorkOrdersUseCase) -> None:
    result = await use_case.execute(current_user=juan)
    assert len(result.items) == 5
    assert all(
        item.assigned_to is not None and item.assigned_to.id == "tech-1"
        for item in result.items
    )


async def test_list_filters_by_status_pending(juan: User, use_case: ListWorkOrdersUseCase) -> None:
    result = await use_case.execute(current_user=juan, statuses=["pending"])
    assert len(result.items) == 3
    assert all(item.status == "pending" for item in result.items)


async def test_list_cursor_pagination(juan: User, use_case: ListWorkOrdersUseCase) -> None:
    page1 = await use_case.execute(current_user=juan, limit=2)
    assert len(page1.items) == 2
    assert page1.next_cursor is not None

    page2 = await use_case.execute(
        current_user=juan,
        limit=2,
        cursor=page1.next_cursor,
    )
    assert len(page2.items) == 2
    assert page1.items[0].id != page2.items[0].id
