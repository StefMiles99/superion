"""Port del bus de eventos en tiempo real — BE-03."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Protocol

EventHandler = Callable[[dict[str, object]], Awaitable[None]]


class IEventBus(Protocol):
    """Publicación y suscripción de eventos por sesión."""

    async def publish(self, session_id: str, message: dict[str, object]) -> None: ...

    async def subscribe(self, session_id: str, handler: EventHandler) -> None: ...

    async def unsubscribe(self, session_id: str, handler: EventHandler) -> None: ...
