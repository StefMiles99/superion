"""Use case ValidatePhoto — BE-04."""

from __future__ import annotations

from application.use_cases.events.append import AppendEventUseCase
from domain.exceptions import NotFoundError
from domain.ports.event_bus import IEventBus
from domain.ports.repositories import IPhotoRepository, ISessionEventRepository
from domain.ports.services import IClock, IPhotoValidator
from domain.ports.storage import IObjectStorage
from domain.value_objects.photo_status import PhotoStatus


class ValidatePhotoUseCase:
    """Valida foto con VLM mock y emite eventos WS."""

    def __init__(
        self,
        *,
        photos: IPhotoRepository,
        storage: IObjectStorage,
        validator: IPhotoValidator,
        events: ISessionEventRepository,
        bus: IEventBus,
        clock: IClock,
        append_events: AppendEventUseCase,
        max_retries: int,
        signed_url_ttl: int,
    ) -> None:
        self._photos = photos
        self._storage = storage
        self._validator = validator
        self._events = events
        self._bus = bus
        self._clock = clock
        self._append = append_events
        self._max_retries = max_retries
        self._signed_url_ttl = signed_url_ttl

    async def execute(self, *, photo_id: str) -> None:
        photo = await self._photos.get_by_id(photo_id)
        if photo is None:
            raise NotFoundError(
                code="PHOTO_NOT_FOUND",
                message="Foto no encontrada.",
                details={"id": photo_id},
            )
        if photo.validation_status != PhotoStatus.PENDING:
            return

        image_bytes = await self._storage.get(photo.storage_path)
        if image_bytes is None:
            raise NotFoundError(
                code="PHOTO_NOT_FOUND",
                message="Archivo de foto no encontrado en storage.",
                details={"id": photo_id},
            )

        criteria = photo.criteria or ""
        result = await self._validator.validate(image_bytes, criteria)

        if result.ok:
            updated = photo.mark_accepted(
                feedback=result.feedback,
                model_version=result.model_version,
            )
            await self._photos.save(updated)
            await self._append.emit_system_event(
                session_id=photo.session_id,
                event_type="photo",
                step_index=photo.step_index,
                payload={
                    "status": "accepted",
                    "photo_id": photo.id,
                    "feedback": result.feedback,
                },
            )
            await self._emit_ws(
                session_id=photo.session_id,
                event_type="photo.validated",
                payload={
                    "photo_id": photo.id,
                    "step_index": photo.step_index,
                    "feedback": result.feedback,
                    "caption": criteria or result.feedback,
                },
            )
            return

        prior_rejects = await self._photos.count_rejected_for_step(
            photo.session_id,
            photo.step_index,
        )
        new_retries = prior_rejects + 1

        if new_retries > self._max_retries:
            updated = photo.mark_escalated(
                feedback=result.feedback,
                retries=new_retries,
                model_version=result.model_version,
            )
            await self._photos.save(updated)
            await self._emit_ws(
                session_id=photo.session_id,
                event_type="photo.escalated",
                payload={
                    "photo_id": photo.id,
                    "step_index": photo.step_index,
                    "feedback": result.feedback,
                    "retries": new_retries,
                    "max_retries": self._max_retries,
                },
            )
            return

        updated = photo.mark_rejected(
            feedback=result.feedback,
            retries=new_retries,
            model_version=result.model_version,
        )
        await self._photos.save(updated)
        await self._emit_ws(
            session_id=photo.session_id,
            event_type="photo.rejected",
            payload={
                "photo_id": photo.id,
                "step_index": photo.step_index,
                "feedback": result.feedback,
                "retries": new_retries,
                "max_retries": self._max_retries,
            },
        )

    async def _emit_ws(
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
