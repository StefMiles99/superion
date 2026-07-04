"""Use case UploadPhoto — BE-04."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING
from uuid import uuid4

from application.dto.photo import UploadPhotoOutput
from application.services.photo_validation import ALLOWED_CONTENT_TYPES, validate_image_magic_bytes
from domain.entities.evidence_photo import EvidencePhoto
from domain.entities.user import User
from domain.exceptions import NotFoundError, ValidationError
from domain.ports.event_bus import IEventBus
from domain.ports.repositories import IPhotoRepository, ISessionEventRepository, ISessionRepository
from domain.ports.services import IClock
from domain.ports.storage import IObjectStorage
from domain.value_objects.photo_status import PhotoStatus

if TYPE_CHECKING:
    from application.use_cases.photos.validate import ValidatePhotoUseCase


class UploadPhotoUseCase:
    """Sube foto, persiste pending y dispara validación async."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        photos: IPhotoRepository,
        storage: IObjectStorage,
        events: ISessionEventRepository,
        bus: IEventBus,
        clock: IClock,
        max_size_bytes: int,
        signed_url_ttl: int,
        validate_photo_use_case: ValidatePhotoUseCase,
    ) -> None:
        self._sessions = sessions
        self._photos = photos
        self._storage = storage
        self._events = events
        self._bus = bus
        self._clock = clock
        self._max_size_bytes = max_size_bytes
        self._signed_url_ttl = signed_url_ttl
        self._validate = validate_photo_use_case

    async def execute(
        self,
        *,
        session_id: str,
        step_index: int,
        event_id: str,
        file_bytes: bytes,
        content_type: str,
        criteria: str | None,
        current_user: User,
    ) -> UploadPhotoOutput:
        session = await self._sessions.get_by_id_for_technician(
            session_id,
            technician_id=current_user.id,
        )
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"id": session_id},
            )

        existing = await self._photos.get_by_event_id(session_id, event_id)
        if existing is not None:
            return UploadPhotoOutput(
                photo_id=existing.id,
                status=existing.validation_status.value,
                uploaded_at=existing.captured_at.isoformat().replace("+00:00", "Z"),
            )

        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="Tipo MIME no soportado.",
                details={"content_type": content_type},
            )

        if len(file_bytes) == 0 or len(file_bytes) > self._max_size_bytes:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="Tamaño de archivo inválido.",
                details={"size_bytes": len(file_bytes), "max_bytes": self._max_size_bytes},
            )

        if not validate_image_magic_bytes(file_bytes, content_type):
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="Magic bytes inválidos para el MIME declarado.",
                details={"content_type": content_type},
            )

        photo_id = str(uuid4())
        ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[content_type]
        storage_path = f"{session_id}/{photo_id}.{ext}"
        await self._storage.put(storage_path, file_bytes, content_type=content_type)

        captured_at = self._clock.now()
        photo = EvidencePhoto(
            id=photo_id,
            session_id=session_id,
            step_index=step_index,
            storage_path=storage_path,
            captured_at=captured_at,
            validation_status=PhotoStatus.PENDING,
            event_id=event_id,
            criteria=criteria,
        )
        await self._photos.save(photo)

        thumbnail_url = await self._storage.get_signed_url(
            storage_path,
            ttl_seconds=self._signed_url_ttl,
        )
        await self._emit_photo_event(
            session_id=session_id,
            event_type="photo.captured",
            payload={
                "photo_id": photo_id,
                "step_index": step_index,
                "thumbnail_url": thumbnail_url,
            },
        )

        asyncio.create_task(self._validate.execute(photo_id=photo_id))

        return UploadPhotoOutput(
            photo_id=photo_id,
            status=PhotoStatus.PENDING.value,
            uploaded_at=captured_at.isoformat().replace("+00:00", "Z"),
        )

    async def _emit_photo_event(
        self,
        *,
        session_id: str,
        event_type: str,
        payload: dict[str, object],
    ) -> None:
        seq = await self._events.next_seq(session_id)
        created_at = self._clock.now().isoformat().replace("+00:00", "Z")
        await self._bus.publish(
            session_id,
            {
                "seq": seq,
                "type": event_type,
                "session_id": session_id,
                "created_at": created_at,
                "payload": payload,
            },
        )
