"""Bus de eventos Redis pub/sub — BE-03 / Cloud Run."""

from __future__ import annotations

import asyncio
import json
import logging

from domain.ports.event_bus import EventHandler

logger = logging.getLogger(__name__)


class RedisEventBus:
    """Pub/sub entre instancias Cloud Run vía Redis."""

    def __init__(self, *, redis_url: str, channel_prefix: str = "superion:session:") -> None:
        if not redis_url:
            msg = "REDIS_URL requerido para RedisEventBus"
            raise ValueError(msg)
        self._redis_url = redis_url
        self._prefix = channel_prefix
        self._local_handlers: dict[str, set[EventHandler]] = {}
        self._global_handlers: set[EventHandler] = set()
        self._listener_task: asyncio.Task[None] | None = None
        self._redis = None
        self._pubsub = None
        self._lock = asyncio.Lock()

    async def _ensure_redis(self) -> None:
        if self._redis is not None:
            return
        from redis import asyncio as aioredis

        self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
        self._pubsub = self._redis.pubsub()
        await self._pubsub.psubscribe(f"{self._prefix}*")
        self._listener_task = asyncio.create_task(self._listen())

    async def _listen(self) -> None:
        assert self._pubsub is not None
        try:
            async for message in self._pubsub.listen():
                if message.get("type") != "pmessage":
                    continue
                channel = str(message.get("channel", ""))
                session_id = channel.removeprefix(self._prefix)
                raw = message.get("data")
                if not session_id or not isinstance(raw, str):
                    continue
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if not isinstance(payload, dict):
                    continue
                await self._dispatch_local(session_id, payload)
        except asyncio.CancelledError:
            return
        except Exception:
            logger.exception("RedisEventBus listener error")

    async def _dispatch_local(self, session_id: str, message: dict[str, object]) -> None:
        async with self._lock:
            handlers = list(self._local_handlers.get(session_id, set()))
            global_handlers = list(self._global_handlers)
        for handler in handlers + global_handlers:
            await handler(message)

    async def publish(self, session_id: str, message: dict[str, object]) -> None:
        await self._ensure_redis()
        assert self._redis is not None
        channel = f"{self._prefix}{session_id}"
        await self._redis.publish(channel, json.dumps(message))
        await self._dispatch_local(session_id, message)

    async def subscribe(self, session_id: str, handler: EventHandler) -> None:
        async with self._lock:
            self._local_handlers.setdefault(session_id, set()).add(handler)

    async def unsubscribe(self, session_id: str, handler: EventHandler) -> None:
        async with self._lock:
            self._local_handlers.get(session_id, set()).discard(handler)

    async def subscribe_all(self, handler: EventHandler) -> None:
        async with self._lock:
            self._global_handlers.add(handler)

    async def unsubscribe_all(self, handler: EventHandler) -> None:
        async with self._lock:
            self._global_handlers.discard(handler)

    async def close(self) -> None:
        if self._listener_task is not None:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._pubsub is not None:
            await self._pubsub.close()
        if self._redis is not None:
            await self._redis.close()
