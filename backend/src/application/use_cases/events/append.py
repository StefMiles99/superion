"""Use case AppendEvent — BE-03."""

from __future__ import annotations

from uuid import uuid4

from application.dto.event import AppendEventOutput
from application.services.event_broadcast import event_to_ws_message
from domain.entities.session_event import SessionEvent, validate_rest_event_payload
from domain.entities.user import User
from domain.exceptions import ConflictError, NotFoundError
from domain.ports.event_bus import IEventBus
from domain.ports.repositories import ISessionEventRepository, ISessionRepository
from domain.ports.services import IClock


class AppendEventUseCase:
    """Persiste evento con idempotency y lo publica en el bus."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        events: ISessionEventRepository,
        bus: IEventBus,
        clock: IClock,
    ) -> None:
        self._sessions = sessions
        self._events = events
        self._bus = bus
        self._clock = clock

    async def execute(
        self,
        *,
        session_id: str,
        event_id: str,
        event_type: str,
        step_index: int,
        payload: dict[str, object],
        current_user: User,
        ws_type: str | None = None,
    ) -> AppendEventOutput:
        session = await self._sessions.get_by_id_for_technician(
            session_id,
            technician_id=current_user.id,
        )
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"id": session_id},
            )
        if session.status.value == "finalized":
            raise ConflictError(
                code="SESSION_ALREADY_FINALIZED",
                message="La sesión ya está finalizada.",
            )

        existing = await self._events.get_by_event_id(session_id, event_id)
        if existing is not None:
            return AppendEventOutput(seq=existing.seq, accepted=True)

        validate_rest_event_payload(event_type, payload)

        seq = await self._events.next_seq(session_id)
        stored_type = ws_type or event_type
        event = SessionEvent(
            id=event_id,
            session_id=session_id,
            seq=seq,
            type=stored_type,
            payload=payload,
            step_index=step_index,
            created_at=self._clock.now(),
        )
        saved = await self._events.append(event)
        await self._bus.publish(session_id, event_to_ws_message(saved))
        return AppendEventOutput(seq=saved.seq, accepted=True)

    async def emit_system_event(
        self,
        *,
        session_id: str,
        event_type: str,
        step_index: int,
        payload: dict[str, object],
        event_id: str | None = None,
    ) -> SessionEvent:
        """Emite evento de sistema (pause/resume/step) sin validación REST."""
        seq = await self._events.next_seq(session_id)
        event = SessionEvent(
            id=event_id or str(uuid4()),
            session_id=session_id,
            seq=seq,
            type=event_type,
            payload=payload,
            step_index=step_index,
            created_at=self._clock.now(),
        )
        saved = await self._events.append(event)
        await self._bus.publish(session_id, event_to_ws_message(saved))
        return saved

    async def find_by_event_id(self, session_id: str, event_id: str) -> SessionEvent | None:
        """Consulta idempotency por event_id del cliente."""
        return await self._events.get_by_event_id(session_id, event_id)
