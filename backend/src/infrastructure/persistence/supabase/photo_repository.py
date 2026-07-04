"""Stub Supabase photo repository — BE-04."""

from __future__ import annotations

from domain.entities.evidence_photo import EvidencePhoto


class SupabasePhotoRepository:
    """Adapter real — activar cuando PERSISTENCE=supabase."""

    async def save(self, photo: EvidencePhoto) -> None:
        raise NotImplementedError(
            "SupabasePhotoRepository.save — implementar al activar PERSISTENCE=supabase"
        )

    async def get_by_id(self, photo_id: str) -> EvidencePhoto | None:
        raise NotImplementedError(
            "SupabasePhotoRepository.get_by_id — implementar al activar PERSISTENCE=supabase"
        )

    async def get_by_id_for_technician(
        self,
        photo_id: str,
        *,
        technician_id: str,
    ) -> EvidencePhoto | None:
        raise NotImplementedError(
            "SupabasePhotoRepository.get_by_id_for_technician — "
            "implementar al activar PERSISTENCE=supabase"
        )

    async def get_by_event_id(self, session_id: str, event_id: str) -> EvidencePhoto | None:
        raise NotImplementedError(
            "SupabasePhotoRepository.get_by_event_id — implementar al activar PERSISTENCE=supabase"
        )

    async def count_rejected_for_step(self, session_id: str, step_index: int) -> int:
        raise NotImplementedError(
            "SupabasePhotoRepository.count_rejected_for_step — "
            "implementar al activar PERSISTENCE=supabase"
        )
