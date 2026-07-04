"""Use case GetPhoto — BE-04."""

from __future__ import annotations

from application.dto.photo import GetPhotoOutput
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import IPhotoRepository
from domain.ports.storage import IObjectStorage


class GetPhotoUseCase:
    """Devuelve metadata de foto con signed URLs."""

    def __init__(
        self,
        *,
        photos: IPhotoRepository,
        storage: IObjectStorage,
        signed_url_ttl: int,
    ) -> None:
        self._photos = photos
        self._storage = storage
        self._signed_url_ttl = signed_url_ttl

    async def execute(self, *, photo_id: str, current_user: User) -> GetPhotoOutput:
        photo = await self._photos.get_by_id_for_technician(
            photo_id,
            technician_id=current_user.id,
        )
        if photo is None:
            raise NotFoundError(
                code="PHOTO_NOT_FOUND",
                message="Foto no encontrada.",
                details={"id": photo_id},
            )

        full_url = await self._storage.get_signed_url(
            photo.storage_path,
            ttl_seconds=self._signed_url_ttl,
        )
        thumbnail_url = full_url

        return GetPhotoOutput(
            id=photo.id,
            session_id=photo.session_id,
            step_index=photo.step_index,
            thumbnail_url=thumbnail_url,
            full_url=full_url,
            validation_status=photo.validation_status.value,
            validation_feedback=photo.validation_feedback,
            captured_at=photo.captured_at.isoformat().replace("+00:00", "Z"),
        )
