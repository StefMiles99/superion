"""Entidad EvidencePhoto — BE-04."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime

from domain.value_objects.photo_status import PhotoStatus


@dataclass(frozen=True, slots=True)
class EvidencePhoto:
    """Foto de evidencia asociada a un paso de sesión."""

    id: str
    session_id: str
    step_index: int
    storage_path: str
    captured_at: datetime
    validation_status: PhotoStatus
    validation_feedback: str | None = None
    retries: int = 0
    model_version: str | None = None
    event_id: str | None = None
    criteria: str | None = None

    def __post_init__(self) -> None:
        if self.step_index < 0:
            raise ValueError("step_index debe ser >= 0")
        if self.retries < 0:
            raise ValueError("retries debe ser >= 0")

    def mark_accepted(self, *, feedback: str, model_version: str) -> EvidencePhoto:
        """Transición pending → accepted."""
        if self.validation_status != PhotoStatus.PENDING:
            raise ValueError("solo pending puede pasar a accepted")
        return replace(
            self,
            validation_status=PhotoStatus.ACCEPTED,
            validation_feedback=feedback,
            model_version=model_version,
        )

    def mark_rejected(self, *, feedback: str, retries: int, model_version: str) -> EvidencePhoto:
        """Transición pending → rejected con contador actualizado."""
        if self.validation_status != PhotoStatus.PENDING:
            raise ValueError("solo pending puede pasar a rejected")
        return replace(
            self,
            validation_status=PhotoStatus.REJECTED,
            validation_feedback=feedback,
            retries=retries,
            model_version=model_version,
        )

    def mark_escalated(self, *, feedback: str, retries: int, model_version: str) -> EvidencePhoto:
        """Transición pending → escalated tras superar reintentos."""
        if self.validation_status != PhotoStatus.PENDING:
            raise ValueError("solo pending puede pasar a escalated")
        return replace(
            self,
            validation_status=PhotoStatus.ESCALATED,
            validation_feedback=feedback,
            retries=retries,
            model_version=model_version,
        )
