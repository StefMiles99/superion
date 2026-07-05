"""Adapter Supabase PhotoRepository — BE-04."""

from __future__ import annotations

from domain.entities.evidence_photo import EvidencePhoto
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import ensure_utc, photo_from_row


class SupabasePhotoRepository(SupabaseRepository):
    async def save(self, photo: EvidencePhoto) -> None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO evidence_photo (
                    id, session_id, step_index, storage_path, captured_at,
                    validation_status, validation_feedback, retries,
                    model_version, event_id, criteria
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                    step_index = EXCLUDED.step_index,
                    storage_path = EXCLUDED.storage_path,
                    captured_at = EXCLUDED.captured_at,
                    validation_status = EXCLUDED.validation_status,
                    validation_feedback = EXCLUDED.validation_feedback,
                    retries = EXCLUDED.retries,
                    model_version = EXCLUDED.model_version,
                    event_id = EXCLUDED.event_id,
                    criteria = EXCLUDED.criteria
                """,
                photo.id,
                photo.session_id,
                photo.step_index,
                photo.storage_path,
                ensure_utc(photo.captured_at),
                photo.validation_status.value,
                photo.validation_feedback,
                photo.retries,
                photo.model_version,
                photo.event_id,
                photo.criteria,
            )

    async def get_by_id(self, photo_id: str) -> EvidencePhoto | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM evidence_photo WHERE id = $1",
                photo_id,
            )
            return photo_from_row(row) if row else None

    async def get_by_id_for_technician(
        self,
        photo_id: str,
        *,
        technician_id: str,
    ) -> EvidencePhoto | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT p.* FROM evidence_photo p
                JOIN maintenance_session s ON s.id = p.session_id
                WHERE p.id = $1 AND s.technician_id = $2
                """,
                photo_id,
                technician_id,
            )
            return photo_from_row(row) if row else None

    async def get_by_event_id(self, session_id: str, event_id: str) -> EvidencePhoto | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM evidence_photo
                WHERE session_id = $1 AND event_id = $2
                """,
                session_id,
                event_id,
            )
            return photo_from_row(row) if row else None

    async def count_rejected_for_step(self, session_id: str, step_index: int) -> int:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT COUNT(*) AS cnt FROM evidence_photo
                WHERE session_id = $1 AND step_index = $2
                  AND validation_status IN ('rejected', 'escalated')
                """,
                session_id,
                step_index,
            )
            assert row is not None
            return int(row["cnt"])

    async def list_by_session(self, session_id: str) -> list[EvidencePhoto]:
        pool = await self._pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM evidence_photo WHERE session_id = $1 ORDER BY captured_at",
                session_id,
            )
            return [photo_from_row(row) for row in rows]
