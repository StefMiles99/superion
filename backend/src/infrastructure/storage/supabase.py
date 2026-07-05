"""Adapter Supabase Object Storage — BE-04."""

from __future__ import annotations

from urllib.parse import quote

import httpx


class SupabaseObjectStorage:
    """Almacenamiento de blobs vía Supabase Storage REST API."""

    def __init__(
        self,
        *,
        supabase_url: str,
        service_role_key: str,
        bucket: str = "superion",
    ) -> None:
        if not supabase_url:
            msg = "SUPABASE_URL requerido para SupabaseObjectStorage"
            raise ValueError(msg)
        if not service_role_key:
            msg = "SUPABASE_SERVICE_ROLE_KEY requerido para SupabaseObjectStorage"
            raise ValueError(msg)
        self._origin = supabase_url.rstrip("/")
        self._api_base = f"{self._origin}/storage/v1"
        self._headers = {
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
        }
        self._bucket = bucket

    def _object_path(self, key: str) -> str:
        return quote(key, safe="/")

    def _upload_url(self, key: str) -> str:
        return f"{self._api_base}/object/{self._bucket}/{self._object_path(key)}"

    async def put(self, key: str, data: bytes, *, content_type: str) -> str:
        headers = {
            **self._headers,
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self._upload_url(key),
                content=data,
                headers=headers,
            )
            response.raise_for_status()
        return key

    async def get(self, key: str) -> bytes | None:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                self._upload_url(key),
                headers=self._headers,
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.content

    async def get_signed_url(self, key: str, *, ttl_seconds: int = 900) -> str:
        sign_url = (
            f"{self._api_base}/object/sign/{self._bucket}/{self._object_path(key)}"
        )
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                sign_url,
                headers={**self._headers, "Content-Type": "application/json"},
                json={"expiresIn": ttl_seconds},
            )
            response.raise_for_status()
            body = response.json()
            signed = str(body.get("signedURL") or body.get("signedUrl") or "")
            if not signed:
                msg = "Supabase Storage no devolvió signedURL"
                raise RuntimeError(msg)
            if signed.startswith("/"):
                return f"{self._origin}{signed}"
            return signed
