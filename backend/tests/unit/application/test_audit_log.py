"""Tests unitarios de audit log — BE-08."""

from datetime import UTC, datetime

import pytest

from application.use_cases.audit.list import ListAuditEntriesUseCase
from application.use_cases.audit.log import LogAuditEntryUseCase
from domain.entities.audit_entry import AuditEntry
from domain.value_objects.action import AuditAction
from infrastructure.persistence.in_memory.audit_log_repository import InMemoryAuditLogRepository
from infrastructure.persistence.in_memory.clock import InMemoryClock


@pytest.fixture
def repo() -> InMemoryAuditLogRepository:
    InMemoryAuditLogRepository.reset_singleton()
    return InMemoryAuditLogRepository.shared()


@pytest.fixture
def clock() -> InMemoryClock:
    c = InMemoryClock()
    c.reset()
    return c


@pytest.fixture
def log_use_case(repo: InMemoryAuditLogRepository, clock: InMemoryClock) -> LogAuditEntryUseCase:
    return LogAuditEntryUseCase(audit_log=repo, clock=clock)


@pytest.fixture
def list_use_case(repo: InMemoryAuditLogRepository) -> ListAuditEntriesUseCase:
    return ListAuditEntriesUseCase(audit_log=repo)


async def test_append_creates_entry(
    log_use_case: LogAuditEntryUseCase,
    repo: InMemoryAuditLogRepository,
) -> None:
    entry = await log_use_case.execute(
        actor_user_id="tech-1",
        action=AuditAction.LOGIN,
        target_type="user",
        target_id="tech-1",
        payload={"email": "juan@planta.com"},
    )

    stored = await repo.get_by_id(entry.id)
    assert stored is not None
    assert stored.action == AuditAction.LOGIN


async def test_append_idempotent_by_entry_id(
    log_use_case: LogAuditEntryUseCase,
    repo: InMemoryAuditLogRepository,
) -> None:
    first = await log_use_case.execute(
        entry_id="fixed-id",
        actor_user_id="tech-1",
        action=AuditAction.LOGIN,
        target_type="user",
        target_id="tech-1",
    )
    second = await log_use_case.execute(
        entry_id="fixed-id",
        actor_user_id="tech-1",
        action=AuditAction.LOGIN,
        target_type="user",
        target_id="tech-1",
    )

    assert first.id == second.id
    items, _ = await repo.list_entries()
    assert len(items) == 1


async def test_list_filters_by_action(
    repo: InMemoryAuditLogRepository,
    list_use_case: ListAuditEntriesUseCase,
) -> None:
    now = datetime(2025, 1, 1, tzinfo=UTC)
    await repo.append(
        AuditEntry(
            id="e1",
            actor_user_id="tech-1",
            action=AuditAction.LOGIN,
            target_type="user",
            target_id="tech-1",
            payload={},
            created_at=now,
        ),
    )
    await repo.append(
        AuditEntry(
            id="e2",
            actor_user_id="tech-1",
            action=AuditAction.LOGOUT,
            target_type="user",
            target_id="tech-1",
            payload={},
            created_at=now,
        ),
    )

    result = await list_use_case.execute(action="login")
    assert len(result.items) == 1
    assert result.items[0].action == "login"


async def test_append_only_no_update_delete(repo: InMemoryAuditLogRepository) -> None:
    assert not hasattr(repo, "update")
    assert not hasattr(repo, "delete")
