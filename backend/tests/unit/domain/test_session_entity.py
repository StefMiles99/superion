"""Tests de entidad MaintenanceSession — BE-02."""

from datetime import UTC, datetime

import pytest

from domain.entities.maintenance_session import MaintenanceSession
from domain.value_objects.status import SessionStatus


def _session(*, status: SessionStatus = SessionStatus.ACTIVE) -> MaintenanceSession:
    return MaintenanceSession(
        id="sess-1",
        work_order_id="wo-1",
        technician_id="tech-1",
        status=status,
        started_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        current_step_index=0,
        langgraph_thread_id="thread-1",
    )


def test_session_is_active_for_active_and_paused() -> None:
    assert _session(status=SessionStatus.ACTIVE).is_active is True
    assert _session(status=SessionStatus.PAUSED).is_active is True
    assert _session(status=SessionStatus.FINALIZED).is_active is False


def test_session_rejects_negative_step_index() -> None:
    with pytest.raises(ValueError, match="current_step_index"):
        MaintenanceSession(
            id="sess-1",
            work_order_id="wo-1",
            technician_id="tech-1",
            status=SessionStatus.ACTIVE,
            started_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
            current_step_index=-1,
            langgraph_thread_id="thread-1",
        )
