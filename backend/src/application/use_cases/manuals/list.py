"""Use case ListManuals — BE-05."""

from __future__ import annotations

from application.dto.manual import ListManualsOutput, ManualListItemDto, ManualUploaderDto
from domain.ports.repositories import IManualRepository, IUserRepository


class ListManualsUseCase:
    """Lista manuales con metadata de uploader."""

    def __init__(
        self,
        *,
        manuals: IManualRepository,
        users: IUserRepository,
    ) -> None:
        self._manuals = manuals
        self._users = users

    async def execute(self) -> ListManualsOutput:
        items: list[ManualListItemDto] = []
        for manual in await self._manuals.list_all():
            user = await self._users.get_by_id(manual.uploaded_by_id)
            uploaded_by = ManualUploaderDto(
                id=manual.uploaded_by_id,
                full_name=user.full_name if user else "Desconocido",
            )
            items.append(
                ManualListItemDto(
                    id=manual.id,
                    title=manual.title,
                    asset_model=manual.asset_model,
                    version=manual.version,
                    status=manual.status.value,
                    index_status=manual.index_status.value,
                    chunk_count=manual.chunk_count,
                    uploaded_at=manual.uploaded_at.isoformat().replace("+00:00", "Z"),
                    uploaded_by=uploaded_by,
                )
            )
        return ListManualsOutput(items=items)
