"""Cliente HTTP OpenRouter — BE-05/BE-06."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
DEFAULT_TIMEOUT = 60.0


class OpenRouterClient:
    """Wrapper mínimo sobre la API REST de OpenRouter."""

    def __init__(
        self,
        *,
        api_key: str,
        app_name: str = "SUPERION",
        base_url: str = OPENROUTER_BASE,
    ) -> None:
        if not api_key:
            msg = "OPENROUTER_API_KEY requerido"
            raise ValueError(msg)
        self._api_key = api_key
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://superion.local",
            "X-Title": app_name,
        }
        self._base_url = base_url.rstrip("/")

    def chat_completion(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        temperature: float = 0.0,
        max_tokens: int = 1024,
        response_format: dict[str, str] | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format is not None:
            payload["response_format"] = response_format

        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            response = client.post(
                f"{self._base_url}/chat/completions",
                headers=self._headers,
                json=payload,
            )
            response.raise_for_status()
            body = response.json()

        choices = body.get("choices")
        if not isinstance(choices, list) or not choices:
            msg = "OpenRouter chat sin choices"
            raise RuntimeError(msg)
        message = choices[0].get("message", {})
        content = message.get("content", "")
        return str(content)

    async def chat_completion_async(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                headers=self._headers,
                json=payload,
            )
            response.raise_for_status()
            body = response.json()

        choices = body.get("choices")
        if not isinstance(choices, list) or not choices:
            msg = "OpenRouter chat sin choices"
            raise RuntimeError(msg)
        message = choices[0].get("message", {})
        return str(message.get("content", ""))

    def embeddings(self, *, model: str, texts: list[str]) -> list[list[float]]:
        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            response = client.post(
                f"{self._base_url}/embeddings",
                headers=self._headers,
                json={"model": model, "input": texts},
            )
            response.raise_for_status()
            body = response.json()

        data = body.get("data")
        if not isinstance(data, list):
            msg = "OpenRouter embeddings sin data"
            raise RuntimeError(msg)

        vectors: list[list[float]] = []
        for item in sorted(data, key=lambda row: int(row.get("index", 0))):
            embedding = item.get("embedding")
            if not isinstance(embedding, list):
                msg = "embedding inválido en respuesta OpenRouter"
                raise RuntimeError(msg)
            vectors.append([float(v) for v in embedding])
        return vectors

    @staticmethod
    def parse_json_object(text: str) -> dict[str, Any]:
        stripped = text.strip()
        if stripped.startswith("```"):
            lines = stripped.splitlines()
            stripped = "\n".join(lines[1:-1] if len(lines) > 2 else lines)
        parsed = json.loads(stripped)
        if not isinstance(parsed, dict):
            msg = "Se esperaba objeto JSON"
            raise TypeError(msg)
        return parsed
