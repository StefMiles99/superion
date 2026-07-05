"""Reranker LLM vía OpenRouter — BE-05."""

from __future__ import annotations

import logging

import httpx

from infrastructure.external.openrouter.client import OpenRouterClient

logger = logging.getLogger(__name__)


class OpenRouterReranker:
    """Reordena candidatos pidiendo al LLM puntuar relevancia."""

    def __init__(self, *, client: OpenRouterClient, model: str) -> None:
        self._client = client
        self._model = model

    def rerank(
        self,
        question: str,
        candidates: list[tuple[object, float]],
    ) -> list[tuple[object, float]]:
        if len(candidates) <= 1:
            return list(candidates)

        lines: list[str] = []
        for index, (chunk, score) in enumerate(candidates):
            content = getattr(chunk, "content", str(chunk))
            preview = str(content)[:400]
            lines.append(f"[{index}] score={score:.3f} text={preview!r}")

        prompt = (
            "Eres un reranker RAG. Dada la pregunta y fragmentos numerados, "
            'responde SOLO JSON: {"order": [indices de más a menos relevante]}.\n'
            f"Pregunta: {question}\n\nFragmentos:\n" + "\n".join(lines)
        )
        try:
            raw = self._client.chat_completion(
                model=self._model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=256,
                response_format={"type": "json_object"},
            )
            parsed = OpenRouterClient.parse_json_object(raw)
        except (httpx.HTTPError, RuntimeError, ValueError) as exc:
            logger.warning("Reranker OpenRouter falló; usando orden híbrido: %s", exc)
            return list(candidates)

        order_raw = parsed.get("order", [])
        if not isinstance(order_raw, list):
            return list(candidates)

        ordered: list[tuple[object, float]] = []
        seen: set[int] = set()
        for item in order_raw:
            if not isinstance(item, int):
                continue
            if item < 0 or item >= len(candidates) or item in seen:
                continue
            seen.add(item)
            ordered.append(candidates[item])

        for index, pair in enumerate(candidates):
            if index not in seen:
                ordered.append(pair)
        return ordered
