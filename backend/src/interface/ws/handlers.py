"""Handlers WebSocket de sesión — BE-03."""

from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from application.services.event_broadcast import event_to_ws_message
from domain.exceptions import UnauthorizedError
from domain.ports.repositories import ISessionEventRepository, ISessionRepository
from domain.ports.services import ITokenService
from domain.services.token_service import InvalidTokenError, TokenExpiredError
from infrastructure.factories import (
    get_session_event_repository,
    get_session_repository,
    get_settings,
    get_token_service,
)
from infrastructure.realtime.event_bus import InMemoryEventBus
from interface.ws.manager import ConnectionManager

router = APIRouter(tags=["websocket"])


async def _authenticate_ws_token(
    token: str,
    tokens: ITokenService,
    sessions: ISessionRepository,
    session_id: str,
) -> str:
    """Valida JWT y pertenencia a sesión. Devuelve user_id."""
    try:
        payload = tokens.decode_access_token(token)
    except TokenExpiredError as exc:
        raise UnauthorizedError(
            code="TOKEN_EXPIRED",
            message="Token expirado.",
        ) from exc
    except InvalidTokenError as exc:
        raise UnauthorizedError(
            code="UNAUTHORIZED",
            message="Token inválido.",
        ) from exc

    uid = str(payload["sub"])
    session = await sessions.get_by_id_for_technician(session_id, technician_id=uid)
    if session is None:
        raise UnauthorizedError(
            code="UNAUTHORIZED",
            message="No autorizado para esta sesión.",
        )
    return uid


async def _replay_events(
    *,
    websocket: WebSocket,
    events_repo: ISessionEventRepository,
    session_id: str,
    last_seq: int,
    replay_enabled: bool,
) -> None:
    if not replay_enabled:
        return

    items = await events_repo.list_since(session_id, since_seq=last_seq, limit=500)
    if not items:
        return

    if len(items) == 1:
        await websocket.send_json(event_to_ws_message(items[0]))
        return

    batch_items = [event_to_ws_message(event) for event in items]
    await websocket.send_json({
        "type": "replay.batch",
        "session_id": session_id,
        "payload": {"items": batch_items},
    })


async def _heartbeat_sender(
    websocket: WebSocket,
    *,
    interval: int,
    last_pong: dict[str, float],
    pong_timeout: int,
) -> None:
    """Envía ping periódico; cierra si el cliente no respondió pong a tiempo."""
    while True:
        await asyncio.sleep(interval)
        await websocket.send_json({"type": "ping"})
        await asyncio.sleep(pong_timeout)
        elapsed = datetime.now(UTC).timestamp() - last_pong["at"]
        if elapsed > pong_timeout:
            await websocket.close(code=1000)
            return


@router.websocket("/v1/ws/sessions/{session_id}")
async def session_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
    last_seq: int = Query(0, ge=0),
) -> None:
    """Canal WS de sesión con auth JWT, replay y heartbeat."""
    settings = get_settings()
    tokens = get_token_service(settings)
    sessions = get_session_repository(settings)
    events_repo = get_session_event_repository(settings)
    manager = ConnectionManager.shared()
    bus = InMemoryEventBus.shared()

    try:
        await _authenticate_ws_token(token, tokens, sessions, session_id)
    except UnauthorizedError:
        await websocket.close(code=4401)
        return

    await manager.connect(session_id, websocket)
    last_pong: dict[str, float] = {"at": datetime.now(UTC).timestamp()}

    async def forward(message: dict[str, object]) -> None:
        if websocket.client_state.name == "CONNECTED":
            await websocket.send_json(message)

    await bus.subscribe(session_id, forward)
    heartbeat: asyncio.Task[None] | None = None

    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=10)
        data = json.loads(raw)
        if data.get("type") != "subscribe":
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "code": "VALIDATION_ERROR",
                    "message": "Primer mensaje debe ser subscribe.",
                },
            })
            await websocket.close(code=1003)
            return

        subscribe_last_seq = int(data.get("last_seq", last_seq))
        await _replay_events(
            websocket=websocket,
            events_repo=events_repo,
            session_id=session_id,
            last_seq=subscribe_last_seq,
            replay_enabled=settings.WS_REPLAY_ON_CONNECT,
        )

        heartbeat = asyncio.create_task(
            _heartbeat_sender(
                websocket,
                interval=settings.WS_HEARTBEAT_INTERVAL,
                last_pong=last_pong,
                pong_timeout=settings.WS_PONG_TIMEOUT,
            )
        )

        while True:
            raw_msg = await websocket.receive_text()
            msg = json.loads(raw_msg)
            msg_type = msg.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "created_at": msg.get("created_at", "")})
            elif msg_type == "pong":
                last_pong["at"] = datetime.now(UTC).timestamp()
            else:
                await websocket.send_json({
                    "type": "error",
                    "payload": {
                        "code": "VALIDATION_ERROR",
                        "message": f"Mensaje no soportado: {msg_type}",
                    },
                })

    except WebSocketDisconnect:
        pass
    except TimeoutError:
        await websocket.close(code=1000)
    finally:
        if heartbeat is not None:
            heartbeat.cancel()
        await bus.unsubscribe(session_id, forward)
        await manager.disconnect(session_id, websocket)
