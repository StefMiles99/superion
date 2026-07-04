"""Blacklist in-memory de tokens — BE-01."""

from __future__ import annotations

import asyncio


class InMemoryTokenBlacklist:
    """Revoca jtis de access y refresh tokens."""

    _instance: InMemoryTokenBlacklist | None = None

    def __init__(self) -> None:
        self._revoked: set[str] = set()
        self._refresh_by_user: dict[str, set[str]] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryTokenBlacklist:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def register_refresh(self, user_id: str, jti: str) -> None:
        async with self._lock:
            self._refresh_by_user.setdefault(user_id, set()).add(jti)

    async def revoke(self, jti: str) -> None:
        async with self._lock:
            self._revoked.add(jti)

    async def is_revoked(self, jti: str) -> bool:
        async with self._lock:
            return jti in self._revoked

    async def revoke_all_for_user(self, user_id: str) -> None:
        async with self._lock:
            refresh_jtis = self._refresh_by_user.pop(user_id, set())
            self._revoked.update(refresh_jtis)

    async def reset(self) -> None:
        async with self._lock:
            self._revoked.clear()
            self._refresh_by_user.clear()
