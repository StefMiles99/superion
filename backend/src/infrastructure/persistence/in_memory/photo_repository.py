"""Repositorio in-memory de fotos — BE-04."""

from __future__ import annotations

import asyncio

from domain.entities.evidence_photo import EvidencePhoto
from domain.value_objects.photo_status import PhotoStatus
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository


class InMemoryPhotoRepository:
    """Fotos indexadas por id y event_id."""

    _instance: InMemoryPhotoRepository | None = None

    def __init__(self) -> None:
        self._photos: dict[str, EvidencePhoto] = {}
        self._event_index: dict[tuple[str, str], str] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryPhotoRepository:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def save(self, photo: EvidencePhoto) -> None:
        async with self._lock:
            self._photos[photo.id] = photo
            if photo.event_id is not None:
                self._event_index[(photo.session_id, photo.event_id)] = photo.id

    async def get_by_id(self, photo_id: str) -> EvidencePhoto | None:
        async with self._lock:
            return self._photos.get(photo_id)

    async def get_by_id_for_technician(
        self,
        photo_id: str,
        *,
        technician_id: str,
    ) -> EvidencePhoto | None:
        photo = await self.get_by_id(photo_id)
        if photo is None:
            return None
        session = await InMemorySessionRepository.shared().get_by_id_for_technician(
            photo.session_id,
            technician_id=technician_id,
        )
        if session is None:
            return None
        return photo

    async def get_by_event_id(self, session_id: str, event_id: str) -> EvidencePhoto | None:
        async with self._lock:
            photo_id = self._event_index.get((session_id, event_id))
            if photo_id is None:
                return None
            return self._photos.get(photo_id)

    async def count_rejected_for_step(self, session_id: str, step_index: int) -> int:
        async with self._lock:
            count = 0
            for photo in self._photos.values():
                if photo.session_id != session_id:
                    continue
                if photo.step_index != step_index:
                    continue
                if photo.validation_status in (PhotoStatus.REJECTED, PhotoStatus.ESCALATED):
                    count += 1
            return count

    async def list_by_session(self, session_id: str) -> list[EvidencePhoto]:
        async with self._lock:
            return [
                photo
                for photo in self._photos.values()
                if photo.session_id == session_id
            ]

    async def reset(self) -> None:
        async with self._lock:
            self._photos.clear()
            self._event_index.clear()
