"""Tests de FinalizeReportUseCase — BE-07."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.reports.build_live import BuildLiveReportUseCase
from application.use_cases.reports.finalize import FinalizeReportUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.user import User
from domain.exceptions import ConflictError
from domain.value_objects.event_type import EventType
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus
from infrastructure.config import Settings
from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.clock import InMemoryClock
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
from infrastructure.services.report_renderer import MockReportRenderer
from infrastructure.storage.in_memory import InMemoryObjectStorage


@pytest.fixture
def technician() -> User:
    return User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan Pérez",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
    )


@pytest.fixture
async def finalize_uc(technician: User) -> FinalizeReportUseCase:
    cfg = Settings(API_BASE_URL="http://test")
    bus = InMemoryEventBus.shared()
    await bus.reset()
    append = AppendEventUseCase(
        sessions=InMemorySessionRepository.shared(),
        events=InMemorySessionEventRepository.shared(),
        bus=bus,
        clock=InMemoryClock.shared(),
    )
    build_live = BuildLiveReportUseCase(
        reports=InMemoryReportRepository.shared(),
        sessions=InMemorySessionRepository.shared(),
        work_orders=InMemoryWorkOrderRepository.shared(),
        templates=InMemoryProcedureTemplateRepository.shared(),
        assets=InMemoryAssetRepository.shared(),
        users=InMemoryUserRepository.shared(),
        events=InMemorySessionEventRepository.shared(),
        photos=InMemoryPhotoRepository.shared(),
        bus=bus,
        clock=InMemoryClock.shared(),
    )
    await build_live.start()
    return FinalizeReportUseCase(
        sessions=InMemorySessionRepository.shared(),
        work_orders=InMemoryWorkOrderRepository.shared(),
        templates=InMemoryProcedureTemplateRepository.shared(),
        events=InMemorySessionEventRepository.shared(),
        reports=InMemoryReportRepository.shared(),
        storage=InMemoryObjectStorage.shared(base_url=cfg.API_BASE_URL),
        renderer=MockReportRenderer(),
        build_live=build_live,
        append_events=append,
        clock=InMemoryClock.shared(),
        signed_url_ttl=900,
    )


async def _create_session_at_last_step(*, last_completed: bool) -> tuple[str, User]:
    orders = InMemoryWorkOrderRepository.shared()
    order = (await orders.list_for_technician(technician_id="tech-1", limit=1))[0][0]
    template = await InMemoryProcedureTemplateRepository.shared().get_by_id(
        order.procedure_template_id
    )
    assert template is not None
    last_index = len(template.steps) - 1

    session_id = str(uuid4())
    session = MaintenanceSession(
        id=session_id,
        work_order_id=order.id,
        technician_id="tech-1",
        status=SessionStatus.ACTIVE,
        started_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        current_step_index=last_index,
        langgraph_thread_id=str(uuid4()),
    )
    await InMemorySessionRepository.shared().save(session)

    bus = InMemoryEventBus.shared()
    append = AppendEventUseCase(
        sessions=InMemorySessionRepository.shared(),
        events=InMemorySessionEventRepository.shared(),
        bus=bus,
        clock=InMemoryClock.shared(),
    )
    if last_completed:
        await append.emit_system_event(
            session_id=session_id,
            event_type=EventType.STEP_COMPLETED.value,
            step_index=last_index,
            payload={"index": last_index, "duration_seconds": 0},
        )

    user = User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan Pérez",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
    )
    return session_id, user


async def test_finalize_happy_path(finalize_uc: FinalizeReportUseCase) -> None:
    session_id, user = await _create_session_at_last_step(last_completed=True)
    result = await finalize_uc.execute(session_id=session_id, current_user=user)
    assert result.session_id == session_id
    assert result.report_id
    assert result.pdf_url.startswith("http://test/v1/mock-storage/reports/")
    assert result.pdf_expires_at.endswith("Z")

    report = await InMemoryReportRepository.shared().get_by_session_id(session_id)
    assert report is not None
    assert report.status.value == "finalized"
    assert report.sha256 is not None


async def test_finalize_rejects_when_last_step_not_completed(
    finalize_uc: FinalizeReportUseCase,
) -> None:
    session_id, user = await _create_session_at_last_step(last_completed=False)
    with pytest.raises(ConflictError, match="último paso"):
        await finalize_uc.execute(session_id=session_id, current_user=user)


async def test_finalize_rejects_when_already_finalized(
    finalize_uc: FinalizeReportUseCase,
) -> None:
    session_id, user = await _create_session_at_last_step(last_completed=True)
    await finalize_uc.execute(session_id=session_id, current_user=user)
    with pytest.raises(ConflictError, match="finalizada"):
        await finalize_uc.execute(session_id=session_id, current_user=user)
