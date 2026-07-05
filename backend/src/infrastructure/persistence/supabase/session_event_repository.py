"""Adapter Supabase/Postgres para eventos de sesión — BE-03."""

from __future__ import annotations

import json

import asyncpg

from domain.entities.session_event import SessionEvent
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import ensure_utc, session_event_from_row

_LOCK_SQL = "SELECT pg_advisory_xact_lock(hashtext($1::text))"

_NEXT_SEQ_SQL = """
SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq
FROM session_event
WHERE session_id = $1
"""

_INSERT_SQL = """
INSERT INTO session_event (id, session_id, seq, type, payload, step_index, created_at)
VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
"""

_SELECT_BY_EVENT_ID_SQL = """
SELECT id, session_id, seq, type, payload, step_index, created_at
FROM session_event
WHERE session_id = $1 AND id = $2
"""

_LIST_SINCE_SQL = """
SELECT id, session_id, seq, type, payload, step_index, created_at
FROM session_event
WHERE session_id = $1 AND seq > $2
ORDER BY seq ASC
LIMIT $3
"""

_HAS_ACCEPTED_PHOTO_SQL = """
SELECT EXISTS(
    SELECT 1
    FROM session_event
    WHERE session_id = $1
      AND step_index = $2
      AND type = 'photo'
      AND payload->>'status' = 'accepted'
) AS found
"""


class SupabaseSessionEventRepository(SupabaseRepository):
    """Persistencia append-only de session_event en Postgres."""

    async def _lock_session(self, conn: asyncpg.Connection, session_id: str) -> None:
        await conn.execute(_LOCK_SQL, session_id)

    async def next_seq(self, session_id: str) -> int:
        pool = await self._pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                await self._lock_session(conn, session_id)
                row = await conn.fetchrow(_NEXT_SEQ_SQL, session_id)
                assert row is not None
                return int(row["next_seq"])

    async def append(self, event: SessionEvent) -> SessionEvent:
        pool = await self._pool()
        created_at = ensure_utc(event.created_at)
        async with pool.acquire() as conn:
            async with conn.transaction():
                await self._lock_session(conn, event.session_id)
                row = await conn.fetchrow(_NEXT_SEQ_SQL, event.session_id)
                assert row is not None
                expected = int(row["next_seq"])
                if event.seq != expected:
                    msg = f"seq esperado {expected}, recibido {event.seq}"
                    raise ValueError(msg)

                try:
                    await conn.execute(
                        _INSERT_SQL,
                        event.id,
                        event.session_id,
                        event.seq,
                        event.type,
                        json.dumps(event.payload),
                        event.step_index,
                        created_at,
                    )
                except asyncpg.UniqueViolationError:
                    existing = await conn.fetchrow(
                        _SELECT_BY_EVENT_ID_SQL,
                        event.session_id,
                        event.id,
                    )
                    if existing is None:
                        raise
                    return session_event_from_row(existing)

                return event

    async def get_by_event_id(self, session_id: str, event_id: str) -> SessionEvent | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(_SELECT_BY_EVENT_ID_SQL, session_id, event_id)
            if row is None:
                return None
            return session_event_from_row(row)

    async def list_since(
        self,
        session_id: str,
        *,
        since_seq: int = 0,
        limit: int = 100,
    ) -> list[SessionEvent]:
        pool = await self._pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(_LIST_SINCE_SQL, session_id, since_seq, limit)
            return [session_event_from_row(row) for row in rows]

    async def has_accepted_photo(self, session_id: str, step_index: int) -> bool:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(_HAS_ACCEPTED_PHOTO_SQL, session_id, step_index)
            assert row is not None
            return bool(row["found"])
