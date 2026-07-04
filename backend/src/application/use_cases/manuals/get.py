"""Use case GetManual — BE-05."""

from __future__ import annotations

from application.dto.manual import GetManualOutput, ManualUploaderDto
from domain.exceptions import NotFoundError
from domain.ports.repositories import IManualRepository, IUserRepository
from domain.ports.storage import IObjectStorage


class GetManualUseCase:
    """Obtiene metadata de manual con URL firmada."""

    def __init__(
        self,
        *,
        manuals: IManualRepository,
        users: IUserRepository,
        storage: IObjectStorage,
        signed_url_ttl: int,
    ) -> None:
        self._manuals = manuals
        self._users = users
        self._storage = storage
        self._signed_url_ttl = signed_url_ttl

    async def execute(self, *, manual_id: str) -> GetManualOutput:
        manual = await self._manuals.get_by_id(manual_id)
        if manual is None:
            raise NotFoundError(
                code="MANUAL_NOT_FOUND",
                message="Manual no encontrado.",
                details={"id": manual_id},
            )

        user = await self._users.get_by_id(manual.uploaded_by_id)
        download_url = await self._storage.get_signed_url(
            manual.storage_path,
            ttl_seconds=self._signed_url_ttl,
        )
        return GetManualOutput(
            id=manual.id,
            title=manual.title,
            asset_model=manual.asset_model,
            version=manual.version,
            status=manual.status.value,
            index_status=manual.index_status.value,
            chunk_count=manual.chunk_count,
            uploaded_at=manual.uploaded_at.isoformat().replace("+00:00", "Z"),
            uploaded_by=ManualUploaderDto(
                id=manual.uploaded_by_id,
                full_name=user.full_name if user else "Desconocido",
            ),
            download_url=download_url,
        )
