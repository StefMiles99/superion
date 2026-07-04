"""Use case ArchiveManual — BE-05."""

from __future__ import annotations

from application.decorators.audit import audit
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import IManualRepository
from domain.value_objects.action import AuditAction


class ArchiveManualUseCase:
    """Archiva manual (soft delete)."""

    def __init__(self, *, manuals: IManualRepository) -> None:
        self._manuals = manuals

    @audit(AuditAction.MANUAL_ARCHIVE, target_type="manual")
    async def execute(self, *, manual_id: str, current_user: User | None = None) -> None:
        manual = await self._manuals.get_by_id(manual_id)
        if manual is None:
            raise NotFoundError(
                code="MANUAL_NOT_FOUND",
                message="Manual no encontrado.",
                details={"id": manual_id},
            )
        archived = manual.archive()
        await self._manuals.save(archived)
