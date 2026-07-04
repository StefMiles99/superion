"""Rate limiter in-memory con ventana deslizante — BE-08."""

from __future__ import annotations

import asyncio
from collections import deque

from domain.exceptions import RateLimitedError
from domain.ports.services import IClock
from infrastructure.errors import ErrorCode


class InMemoryRateLimiter:
    """Limita requests por user_id en ventana deslizante de 60 s."""

    def __init__(
        self,
        *,
        limit_per_minute: int,
        clock: IClock,
        window_seconds: float = 60.0,
    ) -> None:
        self._limit = limit_per_minute
        self._clock = clock
        self._window = window_seconds
        self._requests: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, user_id: str) -> None:
        """Registra request o lanza RateLimitedError."""
        async with self._lock:
            now = self._clock.now().timestamp()
            window_start = now - self._window
            timestamps = self._requests.setdefault(user_id, deque())

            while timestamps and timestamps[0] < window_start:
                timestamps.popleft()

            if len(timestamps) >= self._limit:
                raise RateLimitedError(
                    code=ErrorCode.RATE_LIMITED.value,
                    message="Rate limit excedido. Intenta de nuevo más tarde.",
                    details={"retry_after_seconds": int(self._window)},
                )

            timestamps.append(now)

    async def reset(self) -> None:
        async with self._lock:
            self._requests.clear()


class NoOpRateLimiter:
    """Limiter deshabilitado — siempre permite."""

    async def check(self, user_id: str) -> None:
        return None

    async def reset(self) -> None:
        return None
