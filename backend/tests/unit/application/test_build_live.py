"""Tests de BuildLiveReportUseCase — BE-07."""

import asyncio
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from application.use_cases.reports.build_live import BuildLiveReportUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.value_objects.report_status import ReportStatus
from domain.value_objects.status import SessionStatus
from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.photo_repository import InMemoryPhotoRepository
from infrastructure.persistence.in_memory.procedure_template_repository import (
    InMemoryProcedureTemplateRepository,
)
from infrastructure.persistence.in_memory.report_repository import InMemoryReportRepository
from infrastructure.persistence.in_memory.session_event_repository import (
    InMemorySessionEventRepository,
)
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.persistence.in_memory.user_repository import InMemoryUserRepository
from infrastructure.persistence.in_memory.work_order_repository import InMemoryWorkOrderRepository
from infrastructure.realtime.event_bus import InMemoryEventBus


@pytest.fixture
async def build_live() -> BuildLiveReportUseCase:
    bus = InMemoryEventBus.shared()
    await bus.reset()
    use_case = BuildLiveReportUseCase(
        reports=InMemoryReportRepository.shared(),
        sessions=InMemorySessionRepository.shared(),
        work_orders=InMemoryWorkOrderRepository.shared(),
        templates=InMemoryProcedureTemplateRepository.shared(),
        assets=InMemoryAssetRepository.shared(),
        users=InMemoryUserRepository.shared(),
        events=InMemorySessionEventRepository.shared(),
        photos=InMemoryPhotoRepository.shared(),
        bus=bus,
        clock=__import__(
            "infrastructure.persistence.in_memory.clock",
            fromlist=["InMemoryClock"],
        ).InMemoryClock.shared(),
    )
    await use_case.start()
    return use_case


async def _seed_session() -> str:
    orders = InMemoryWorkOrderRepository.shared()
    order = (await orders.list_for_technician(technician_id="tech-1", limit=1))[0][0]
    session_id = str(uuid4())
    session = MaintenanceSession(
        id=session_id,
        work_order_id=order.id,
        technician_id="tech-1",
        status=SessionStatus.ACTIVE,
        started_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        current_step_index=0,
        langgraph_thread_id=str(uuid4()),
    )
    await InMemorySessionRepository.shared().save(session)
    return session_id


async def test_build_live_updates_report_and_computes_diff(
    build_live: BuildLiveReportUseCase,
) -> None:
    session_id = await _seed_session()
    report = await build_live.ensure_report(session_id)
    assert report.version == 1

    bus = InMemoryEventBus.shared()
    received: asyncio.Queue[dict[str, object]] = asyncio.Queue()

    async def handler(message: dict[str, object]) -> None:
        if message.get("type") == "report.updated":
            await received.put(message)

    await bus.subscribe(session_id, handler)

    await bus.publish(
        session_id,
        {
            "seq": 5,
            "type": "step.completed",
            "session_id": session_id,
            "created_at": "2026-07-04T14:05:00Z",
            "payload": {"index": 0, "duration_seconds": 30},
        },
    )

    msg = await asyncio.wait_for(received.get(), timeout=1)
    assert msg["type"] == "report.updated"
    payload = msg["payload"]
    assert isinstance(payload, dict)
    assert payload["version"] == 2
    diff = payload["diff"]
    assert isinstance(diff, dict)
    assert diff["added_event_seq"] == 5
    assert diff["step_index"] == 0

    updated = await InMemoryReportRepository.shared().get_by_session_id(session_id)
    assert updated is not None
    assert updated.version == 2
    assert updated.status == ReportStatus.DRAFT
