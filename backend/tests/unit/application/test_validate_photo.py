"""Tests ValidatePhoto — BE-04."""

from uuid import uuid4

import pytest

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.photos.validate import ValidatePhotoUseCase
from domain.entities.evidence_photo import EvidencePhoto
from domain.entities.maintenance_session import MaintenanceSession
from domain.services.photo_validator import MockPhotoValidator
from domain.value_objects.photo_status import PhotoStatus
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
    return validate, photos, storage, events, bus, clock


async def _create_pending(
    photos: InMemoryPhotoRepository,
    storage: InMemoryObjectStorage,
    clock: InMemoryClock,
    *,
    file_bytes: bytes,
    step_index: int = 3,
) -> EvidencePhoto:
    photo_id = str(uuid4())
    path = f"sess-1/{photo_id}.jpg"
    await storage.put(path, file_bytes, content_type="image/jpeg")
    photo = EvidencePhoto(
        id=photo_id,
        session_id="sess-1",
        step_index=step_index,
        storage_path=path,
        captured_at=clock.now(),
        validation_status=PhotoStatus.PENDING,
    )
    await photos.save(photo)
    return photo


async def test_validate_accepts_photo(setup) -> None:
    validate, photos, storage, events, _bus, clock = setup
    photo = await _create_pending(photos, storage, clock, file_bytes=b"Aok")
    await validate.execute(photo_id=photo.id)
    updated = await photos.get_by_id(photo.id)
    assert updated is not None
    assert updated.validation_status == PhotoStatus.ACCEPTED
    assert await events.has_accepted_photo("sess-1", 3) is True


async def test_validate_rejects_photo(setup) -> None:
    validate, photos, storage, _events, _bus, clock = setup
    photo = await _create_pending(photos, storage, clock, file_bytes=b"Rbad")
    await validate.execute(photo_id=photo.id)
    updated = await photos.get_by_id(photo.id)
    assert updated is not None
    assert updated.validation_status == PhotoStatus.REJECTED
    assert updated.retries == 1


async def test_validate_escalates_on_fourth_rejection(setup) -> None:
    validate, photos, storage, _events, bus, clock = setup
    received: list[dict[str, object]] = []

    async def handler(message: dict[str, object]) -> None:
        received.append(message)

    await bus.subscribe("sess-1", handler)

    for _ in range(4):
        photo = await _create_pending(photos, storage, clock, file_bytes=b"Rbad")
        await validate.execute(photo_id=photo.id)

    last = await photos.get_by_id(photo.id)
    assert last is not None
    assert last.validation_status == PhotoStatus.ESCALATED
    assert last.retries == 4
    assert any(msg.get("type") == "photo.escalated" for msg in received)
