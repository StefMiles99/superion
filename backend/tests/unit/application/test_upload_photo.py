"""Tests UploadPhoto — BE-04."""

import asyncio
from uuid import uuid4

import pytest

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.photos.upload import UploadPhotoUseCase
from application.use_cases.photos.validate import ValidatePhotoUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.user import User
from domain.exceptions import NotFoundError, ValidationError
from domain.services.photo_validator import MockPhotoValidator
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.photo_repository import InMemoryPhotoRepository
from infrastructure.persistence.in_memory.session_event_repository import (
    InMemorySessionEventRepository,
)
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.realtime.event_bus import InMemoryEventBus
from infrastructure.storage.in_memory import InMemoryObjectStorage


@pytest.fixture
async def setup():
    clock = InMemoryClock.shared()
    sessions = InMemorySessionRepository.shared()
    photos = InMemoryPhotoRepository.shared()
    events = InMemorySessionEventRepository.shared()
    bus = InMemoryEventBus.shared()
    storage = InMemoryObjectStorage.shared(base_url="http://test")
    await sessions.reset()
    await photos.reset()
    await events.reset()
    await bus.reset()
    await storage.reset()

    session = MaintenanceSession(
        id="sess-1",
        work_order_id="wo-003",
        technician_id="tech-1",
        status=SessionStatus.ACTIVE,
        started_at=clock.now(),
        current_step_index=3,
        langgraph_thread_id="thread-1",
    )
    await sessions.save(session)

    append = AppendEventUseCase(sessions=sessions, events=events, bus=bus, clock=clock)
    validate = ValidatePhotoUseCase(
        photos=photos,
        storage=storage,
        validator=MockPhotoValidator(),
        events=events,
        bus=bus,
        clock=clock,
        append_events=append,
        max_retries=3,
        signed_url_ttl=900,
    )
    upload = UploadPhotoUseCase(
        sessions=sessions,
        photos=photos,
        storage=storage,
        events=events,
        bus=bus,
        clock=clock,
        max_size_bytes=10 * 1024 * 1024,
        signed_url_ttl=900,
        validate_photo_use_case=validate,
    )

    user = User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=False,
    )
    return upload, validate, photos, user


async def _drain_validation_tasks() -> None:
    await asyncio.sleep(0.05)


async def test_upload_happy_path_returns_pending(setup) -> None:
    upload, _validate, photos, user = setup
    result = await upload.execute(
        session_id="sess-1",
        step_index=3,
        event_id=str(uuid4()),
        file_bytes=b"Acontenido",
        content_type="image/jpeg",
        criteria="sensor visible",
        current_user=user,
    )
    await _drain_validation_tasks()

    assert result.status == "pending"
    photo = await photos.get_by_id(result.photo_id)
    assert photo is not None
    assert photo.validation_status.value == "accepted"


async def test_upload_rejects_invalid_mime(setup) -> None:
    upload, _validate, _photos, user = setup
    with pytest.raises(ValidationError) as exc:
        await upload.execute(
            session_id="sess-1",
            step_index=3,
            event_id=str(uuid4()),
            file_bytes=b"Adata",
            content_type="text/plain",
            criteria=None,
            current_user=user,
        )
    assert exc.value.code == "VALIDATION_ERROR"


async def test_upload_rejects_oversized_file(setup) -> None:
    upload, _validate, _photos, user = setup
    with pytest.raises(ValidationError) as exc:
        await upload.execute(
            session_id="sess-1",
            step_index=3,
            event_id=str(uuid4()),
            file_bytes=b"A" + (b"x" * (10 * 1024 * 1024)),
            content_type="image/jpeg",
            criteria=None,
            current_user=user,
        )
    assert "Tamaño" in exc.value.message


async def test_upload_session_not_found(setup) -> None:
    upload, _validate, _photos, user = setup
    with pytest.raises(NotFoundError) as exc:
        await upload.execute(
            session_id="missing",
            step_index=3,
            event_id=str(uuid4()),
            file_bytes=b"Adata",
            content_type="image/jpeg",
            criteria=None,
            current_user=user,
        )
    assert exc.value.code == "SESSION_NOT_FOUND"
