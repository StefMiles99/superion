"""Use case UploadManual — BE-05."""

from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING
from uuid import uuid4

from application.dto.manual import UploadManualOutput
from domain.entities.manual import Manual
from domain.entities.user import User
from domain.exceptions import NotFoundError, ValidationError
from domain.ports.repositories import IManualRepository
from domain.ports.services import IClock
from domain.ports.storage import IObjectStorage
from domain.value_objects.manual_status import IndexStatus, ManualStatus

if TYPE_CHECKING:
    from application.use_cases.manuals.index import IndexManualUseCase

PDF_MAGIC = b"%PDF"
CONTENT_TYPE_PDF = "application/pdf"


def validate_pdf_bytes(file_bytes: bytes) -> None:
    """Valida magic bytes y contenido mínimo de PDF."""
    if len(file_bytes) < 5 or not file_bytes.startswith(PDF_MAGIC):
        raise ValidationError(
            code="MANUAL_INVALID_PDF",
            message="PDF corrupto o no procesable.",
            details={"reason": "invalid_magic_bytes"},
        )


class UploadManualUseCase:
    """Sube PDF, crea manual pending y dispara indexación async."""

    def __init__(
        self,
        *,
        manuals: IManualRepository,
        storage: IObjectStorage,
        clock: IClock,
        index_manual: IndexManualUseCase,
        max_size_bytes: int,
        estimated_seconds: int,
    ) -> None:
        self._manuals = manuals
        self._storage = storage
        self._clock = clock
        self._index_manual = index_manual
        self._max_size_bytes = max_size_bytes
        self._estimated_seconds = estimated_seconds

    async def execute(
        self,
        *,
        title: str,
        asset_model: str,
        file_bytes: bytes,
        content_type: str,
        replaces_manual_id: str | None,
        current_user: User,
    ) -> UploadManualOutput:
        if not title.strip():
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="title es obligatorio.",
            )
        if not asset_model.strip():
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="asset_model es obligatorio.",
            )
        if content_type != CONTENT_TYPE_PDF:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="Solo se acepta application/pdf.",
                details={"content_type": content_type},
            )
        if len(file_bytes) == 0 or len(file_bytes) > self._max_size_bytes:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="Tamaño de PDF inválido.",
                details={"size_bytes": len(file_bytes), "max_bytes": self._max_size_bytes},
            )

        validate_pdf_bytes(file_bytes)

        if replaces_manual_id is not None:
            previous = await self._manuals.get_by_id(replaces_manual_id)
            if previous is None:
                raise NotFoundError(
                    code="MANUAL_NOT_FOUND",
                    message="Manual a reemplazar no encontrado.",
                    details={"id": replaces_manual_id},
                )
            archived = previous.archive()
            await self._manuals.save(archived)

        manual_id = str(uuid4())
        version = await self._manuals.next_version_for_asset_model(asset_model)
        storage_path = f"{current_user.plant_id}/{manual_id}/{version}.pdf"
        await self._storage.put(storage_path, file_bytes, content_type=content_type)

        uploaded_at = self._clock.now()
        manual = Manual(
            id=manual_id,
            title=title.strip(),
            asset_model=asset_model.strip(),
            version=version,
            status=ManualStatus.INDEXING,
            index_status=IndexStatus.PENDING,
            storage_path=storage_path,
            chunk_count=0,
            uploaded_at=uploaded_at,
            uploaded_by_id=current_user.id,
            plant_id=current_user.plant_id,
        )
        await self._manuals.save(manual)
        self._index_manual.schedule(manual_id=manual_id)

        _ = hashlib.sha256(file_bytes).hexdigest()

        return UploadManualOutput(
            manual_id=manual_id,
            index_status=IndexStatus.PENDING.value,
            estimated_seconds=self._estimated_seconds,
        )
