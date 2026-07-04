"""Validador HMAC de webhooks ElevenLabs — BE-06."""

from __future__ import annotations

import hashlib
import hmac

from domain.exceptions import UnauthorizedError
from domain.ports.services import IClock


class HmacSignatureValidator:
    """Verifica header X-ElevenLabs-Signature (t={ts},v1={sig})."""

    def __init__(
        self,
        *,
        secret: str,
        window_seconds: int,
        clock: IClock,
    ) -> None:
        self._secret = secret
        self._window = window_seconds
        self._clock = clock

    def validate(self, *, payload: bytes, signature_header: str | None) -> None:
        if not signature_header:
            raise UnauthorizedError(
                code="INVALID_SIGNATURE",
                message="Firma de webhook ausente.",
            )

        parts: dict[str, str] = {}
        for segment in signature_header.split(","):
            if "=" not in segment:
                continue
            key, value = segment.split("=", 1)
            parts[key.strip()] = value.strip()

        timestamp = parts.get("t")
        signature = parts.get("v1")
        if not timestamp or not signature:
            raise UnauthorizedError(
                code="INVALID_SIGNATURE",
                message="Formato de firma inválido.",
            )

        try:
            ts_int = int(timestamp)
        except ValueError as exc:
            raise UnauthorizedError(
                code="INVALID_SIGNATURE",
                message="Timestamp inválido.",
            ) from exc

        now_ts = int(self._clock.now().timestamp())
        if abs(now_ts - ts_int) > self._window:
            raise UnauthorizedError(
                code="INVALID_SIGNATURE",
                message="Timestamp de webhook expirado.",
            )

        signed_payload = f"{timestamp}.{payload.decode('utf-8')}".encode()
        expected = hmac.new(
            self._secret.encode(),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            raise UnauthorizedError(
                code="INVALID_SIGNATURE",
                message="Firma de webhook incorrecta.",
            )
