"""Validador de fotos VLM vía OpenRouter — BE-04."""

from __future__ import annotations

import base64
from dataclasses import dataclass

from infrastructure.external.openrouter.client import OpenRouterClient


@dataclass(frozen=True, slots=True)
class VlmValidationResult:
    ok: bool
    feedback: str
    confidence: float
    model_version: str


class OpenRouterPhotoValidator:
    """Valida evidencia fotográfica con modelo multimodal."""

    def __init__(self, *, client: OpenRouterClient, model: str) -> None:
        self._client = client
        self._model = model

    async def validate(self, image_bytes: bytes, criteria: str) -> VlmValidationResult:
        if not image_bytes:
            return VlmValidationResult(
                ok=False,
                feedback="Imagen vacía o ilegible",
                confidence=0.0,
                model_version=self._model,
            )

        b64 = base64.standard_b64encode(image_bytes).decode("ascii")
        mime = _guess_mime(image_bytes)
        prompt = (
            "Eres inspector de mantenimiento industrial. "
            "Evalúa si la foto cumple el criterio técnico.\n"
            f"Criterio: {criteria or 'evidencia clara del paso'}\n"
            'Responde SOLO JSON: {"ok": bool, "feedback": str, "confidence": 0-1}'
        )
        raw = await self._client.chat_completion_async(
            model=self._model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                    ],
                }
            ],
            temperature=0.0,
            max_tokens=300,
        )
        parsed = OpenRouterClient.parse_json_object(raw)
        ok = bool(parsed.get("ok", False))
        feedback = str(parsed.get("feedback", "No cumple criterio"))
        confidence_raw = parsed.get("confidence", 0.5)
        confidence = float(confidence_raw) if isinstance(confidence_raw, (int, float)) else 0.5
        return VlmValidationResult(
            ok=ok,
            feedback=feedback,
            confidence=max(0.0, min(confidence, 1.0)),
            model_version=self._model,
        )


def _guess_mime(data: bytes) -> str:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG"):
        return "image/png"
    if data.startswith(b"GIF8"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"
