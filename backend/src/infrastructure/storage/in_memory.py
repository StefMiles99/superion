"""Almacenamiento in-memory de objetos — BE-04."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from urllib.parse import quote


class InMemoryObjectStorage:
    """Dict de bytes + URLs firmadas simuladas."""

    _instance: InMemoryObjectStorage | None = None

    def __init__(self, *, base_url: str = "http://localhost:8000") -> None:
        self._base_url = base_url.rstrip("/")
        self._objects: dict[str, bytes] = {}
        self._content_types: dict[str, str] = {}
        self._expiry: dict[str, datetime] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls, *, base_url: str = "http://localhost:8000") -> InMemoryObjectStorage:
        if cls._instance is None:
            cls._instance = cls(base_url=base_url)
        else:
            cls._instance._base_url = base_url.rstrip("/")
        return cls._instance

    async def put(self, key: str, data: bytes, *, content_type: str) -> str:
        async with self._lock:
            self._objects[key] = data
            self._content_types[key] = content_type
            return key

    async def get(self, key: str) -> bytes | None:
        async with self._lock:
            return self._objects.get(key)

    async def get_content_type(self, key: str) -> str | None:
        async with self._lock:
            return self._content_types.get(key)

    async def get_signed_url(self, key: str, *, ttl_seconds: int = 900) -> str:
        expires_at = datetime.now(tz=UTC) + timedelta(seconds=ttl_seconds)
        async with self._lock:
            self._expiry[key] = expires_at
        encoded = quote(key, safe="/")
        expires_ts = int(expires_at.timestamp())
        return f"{self._base_url}/v1/mock-storage/{encoded}?expires={expires_ts}"

    async def is_url_valid(self, key: str, expires_ts: int) -> bool:
        async with self._lock:
            if key not in self._objects:
                return False
            stored = self._expiry.get(key)
            if stored is None:
                return False
            return int(stored.timestamp()) >= expires_ts

    async def reset(self) -> None:
        async with self._lock:
            self._objects.clear()
            self._content_types.clear()
            self._expiry.clear()
