"""Use case ReindexManual — BE-05."""

from __future__ import annotations

from application.dto.manual import ReindexManualOutput
from application.use_cases.manuals.index import IndexManualUseCase
from domain.exceptions import NotFoundError
from domain.ports.repositories import IManualRepository
from domain.value_objects.manual_status import IndexStatus


class ReindexManualUseCase:
    """Reinicia indexación de un manual existente."""

    def __init__(
        self,
        *,
        manuals: IManualRepository,
        index_manual: IndexManualUseCase,
    ) -> None:
        self._manuals = manuals
        self._index_manual = index_manual

    async def execute(self, *, manual_id: str) -> ReindexManualOutput:
        manual = await self._manuals.get_by_id(manual_id)
        if manual is None:
            raise NotFoundError(
                code="MANUAL_NOT_FOUND",
                message="Manual no encontrado.",
                details={"id": manual_id},
            )

        updated = manual.mark_reindex_pending()
        await self._manuals.save(updated)
        self._index_manual.schedule(manual_id=manual_id)

        return ReindexManualOutput(
            manual_id=manual_id,
            index_status=IndexStatus.PENDING.value,
        )
