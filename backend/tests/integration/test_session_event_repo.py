"""Tests InMemorySessionEventRepository — BE-03."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from domain.entities.session_event import SessionEvent
from infrastructure.persistence.in_memory.session_event_repository import (
    InMemorySessionEventRepository,
)


@pytest.fixture
async def repo() -> InMemorySessionEventRepository:
    instance = InMemorySessionEventRepository.shared()
    await instance.reset()
    return instance


def _event(*, session_id: str = "sess-1", seq: int = 1) -> SessionEvent:
    return SessionEvent(
        id=str(uuid4()),
        session_id=session_id,
        seq=seq,
        type="measurement",
        payload={"name": "p", "value": 1.0, "unit": "psi"},
        step_index=0,
        created_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
    )


async def test_seq_monotonic_per_session(repo: InMemorySessionEventRepository) -> None:
    assert await repo.next_seq("sess-1") == 1
    await repo.append(_event(seq=1))
    assert await repo.next_seq("sess-1") == 2
    await repo.append(_event(seq=2))
    assert await repo.next_seq("sess-1") == 3


async def test_list_since_returns_ordered(repo: InMemorySessionEventRepository) -> None:
    await repo.append(_event(seq=1))
    await repo.append(_event(seq=2))
    await repo.append(_event(seq=3))

    items = await repo.list_since("sess-1", since_seq=1)
    assert [event.seq for event in items] == [2, 3]


async def test_has_accepted_photo(repo: InMemorySessionEventRepository) -> None:
    await repo.append(
        SessionEvent(
            id=str(uuid4()),
            session_id="sess-1",
            seq=1,
            type="photo",
            payload={"status": "accepted"},
            step_index=3,
            created_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        )
    )
    assert await repo.has_accepted_photo("sess-1", 3) is True
    assert await repo.has_accepted_photo("sess-1", 5) is False
