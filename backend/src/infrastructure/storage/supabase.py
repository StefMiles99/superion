"""Stub Supabase Object Storage — BE-04."""

from __future__ import annotations


class SupabaseObjectStorage:
    """Adapter real — activar cuando STORAGE=supabase."""

    async def put(self, key: str, data: bytes, *, content_type: str) -> str:
        raise NotImplementedError(
            "SupabaseObjectStorage.put — implementar al activar STORAGE=supabase"
        )

    async def get(self, key: str) -> bytes | None:
        raise NotImplementedError(
            "SupabaseObjectStorage.get — implementar al activar STORAGE=supabase"
        )

    async def get_signed_url(self, key: str, *, ttl_seconds: int = 900) -> str:
        raise NotImplementedError(
            "SupabaseObjectStorage.get_signed_url — implementar al activar STORAGE=supabase"
        )
