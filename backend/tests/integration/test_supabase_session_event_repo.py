"""Tests SupabaseSessionEventRepository — requiere Postgres (DATABASE_URL)."""

from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import asyncpg
import pytest

from domain.entities.session_event import SessionEvent
from infrastructure.persistence.supabase.db_pool import reset_db_pool
from infrastructure.persistence.supabase.session_event_repository import (
    SupabaseSessionEventRepository,
)

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase"
    / "migrations"
    / "0001_init.sql"
)

_STEPS_JSON = """[
  {"index": 0, "title": "Paso 1", "description": "Desc", "estimated_minutes": 5,
   "critical": false, "requires_photo": false, "photo_criteria": null}
]"""


async def _ensure_session_parent(conn: asyncpg.Connection, session_id: str) -> None:
    """Inserta cadena mínima de FKs para session_event."""
    work_order_id = f"wo-{session_id[:8]}"
    await conn.execute(
        """
        INSERT INTO plant (id, name, location, created_at)
        VALUES ('plant-1', 'Test Plant', 'Test', $1)
        ON CONFLICT (id) DO NOTHING
        """,
        datetime(2026, 1, 1, tzinfo=UTC),
    )
    await conn.execute(
        """
        INSERT INTO procedure_template (
            id, name, version, manual_id, steps,
            critical_step_indices, photo_required_step_indices, estimated_minutes
        ) VALUES (
            'tmpl-test', 'Test Template', '1', 'manual-test', $1::jsonb,
            '{}', '{}', 30
        )
        ON CONFLICT (id) DO NOTHING
        """,
        _STEPS_JSON,
    )
    await conn.execute(
        """
        INSERT INTO asset (
            id, plant_id, tag, name, model, manufacturer, current_manual_id
        ) VALUES (
            'asset-test', 'plant-1', 'TAG-1', 'Asset Test', 'Model X', 'Mfg', NULL
        )
        ON CONFLICT (id) DO NOTHING
        """
    )
    await conn.execute(
        """
        INSERT INTO work_order (
            id, code, asset_id, type, priority, status, assigned_to,
            planned_start, planned_end, procedure_template_id, created_at
        ) VALUES (
            $1, 'OT-TEST', 'asset-test', 'preventive', 'high', 'pending', 'tech-1',
            $2, $3, 'tmpl-test', $2
        )
        ON CONFLICT (id) DO NOTHING
        """,
        work_order_id,
        datetime(2026, 7, 4, 8, 0, tzinfo=UTC),
        datetime(2026, 7, 4, 10, 0, tzinfo=UTC),
    )
    await conn.execute(
        """
        INSERT INTO maintenance_session (
            id, work_order_id, technician_id, status, started_at,
            current_step_index, langgraph_thread_id
        ) VALUES ($1, $2, 'tech-1', 'active', $3, 0, 'thread-test')
        ON CONFLICT (id) DO NOTHING
        """,
        session_id,
        work_order_id,
        datetime(2026, 7, 4, 9, 0, tzinfo=UTC),
    )


def _event(*, session_id: str, seq: int) -> SessionEvent:
    return SessionEvent(
        id=str(uuid4()),
        session_id=session_id,
        seq=seq,
        type="utterance",
        payload={"text": f"turno {seq}", "speaker": "technician"},
        step_index=0,
        created_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
    )


@pytest.fixture
async def dsn() -> str:
    import os

    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        pytest.skip("DATABASE_URL no configurado")
    return url


@pytest.fixture
async def repo(dsn: str) -> SupabaseSessionEventRepository:
    await reset_db_pool()
    pool = await asyncpg.create_pool(dsn, min_size=1, max_size=2, statement_cache_size=0)
    migration_sql = MIGRATION.read_text(encoding="utf-8")
    async with pool.acquire() as conn:
        await conn.execute(migration_sql)
        await conn.execute("TRUNCATE session_event CASCADE")
    await pool.close()
    await reset_db_pool()
    repository = SupabaseSessionEventRepository(dsn=dsn)

    pool = await asyncpg.create_pool(dsn, min_size=1, max_size=2, statement_cache_size=0)
    async with pool.acquire() as conn:
        for session_id in ("sess-test-a", "sess-test-b"):
            await _ensure_session_parent(conn, session_id)
    await pool.close()

    return repository


@pytest.fixture(autouse=True)
async def cleanup_pool() -> None:
    yield
    await reset_db_pool()


async def _prepare_session(repo_dsn: str, session_id: str) -> None:
    pool = await asyncpg.create_pool(repo_dsn, min_size=1, max_size=2, statement_cache_size=0)
    async with pool.acquire() as conn:
        await _ensure_session_parent(conn, session_id)
    await pool.close()


@pytest.fixture
def repo_dsn(dsn: str) -> str:
    return dsn


async def test_seq_monotonic_per_session(
    repo: SupabaseSessionEventRepository,
    repo_dsn: str,
) -> None:
    session_id = str(uuid4())
    await _prepare_session(repo_dsn, session_id)
    assert await repo.next_seq(session_id) == 1
    await repo.append(_event(session_id=session_id, seq=1))
    assert await repo.next_seq(session_id) == 2
    await repo.append(_event(session_id=session_id, seq=2))
    assert await repo.next_seq(session_id) == 3


async def test_list_since_returns_ordered(
    repo: SupabaseSessionEventRepository,
    repo_dsn: str,
) -> None:
    session_id = str(uuid4())
    await _prepare_session(repo_dsn, session_id)
    await repo.append(_event(session_id=session_id, seq=1))
    await repo.append(_event(session_id=session_id, seq=2))
    await repo.append(_event(session_id=session_id, seq=3))

    items = await repo.list_since(session_id, since_seq=1)
    assert [event.seq for event in items] == [2, 3]


async def test_get_by_event_id(
    repo: SupabaseSessionEventRepository,
    repo_dsn: str,
) -> None:
    session_id = str(uuid4())
    await _prepare_session(repo_dsn, session_id)
    event_id = str(uuid4())
    event = SessionEvent(
        id=event_id,
        session_id=session_id,
        seq=1,
        type="observation",
        payload={"text": "válvula cerrada", "source": "voice"},
        step_index=2,
        created_at=datetime(2026, 7, 4, 14, 5, tzinfo=UTC),
    )
    await repo.append(event)

    found = await repo.get_by_event_id(session_id, event_id)
    assert found is not None
    assert found.payload["text"] == "válvula cerrada"
    assert found.step_index == 2


async def test_has_accepted_photo(
    repo: SupabaseSessionEventRepository,
    repo_dsn: str,
) -> None:
    session_id = str(uuid4())
    await _prepare_session(repo_dsn, session_id)
    await repo.append(
        SessionEvent(
            id=str(uuid4()),
            session_id=session_id,
            seq=1,
            type="photo",
            payload={"status": "accepted"},
            step_index=3,
            created_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        )
    )
    assert await repo.has_accepted_photo(session_id, 3) is True
    assert await repo.has_accepted_photo(session_id, 5) is False


async def test_append_idempotent_by_event_id(
    repo: SupabaseSessionEventRepository,
    repo_dsn: str,
) -> None:
    session_id = str(uuid4())
    await _prepare_session(repo_dsn, session_id)
    event_id = str(uuid4())
    event = SessionEvent(
        id=event_id,
        session_id=session_id,
        seq=1,
        type="finding",
        payload={"text": "fuga", "severity": "med"},
        step_index=0,
        created_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
    )
    saved = await repo.append(event)
    assert saved.id == event_id

    duplicate = SessionEvent(
        id=event_id,
        session_id=session_id,
        seq=2,
        type="finding",
        payload={"text": "otro"},
        step_index=0,
        created_at=datetime(2026, 7, 4, 14, 1, tzinfo=UTC),
    )
    existing = await repo.append(duplicate)
    assert existing.id == event_id
    assert existing.payload["text"] == "fuga"
