"""Clasificador de intents vía LLM OpenRouter — BE-06."""

from __future__ import annotations

from infrastructure.external.openrouter.client import OpenRouterClient

_INTENTS = (
    "advance",
    "repeat",
    "skip",
    "pause",
    "query",
    "measurement",
    "finding",
    "narration",
    "unknown",
)


class OpenRouterIntentClassifier:
    """Clasifica utterances de voz con LLM."""

    def __init__(self, *, client: OpenRouterClient, model: str) -> None:
        self._client = client
        self._model = model

    def classify(self, text: str) -> tuple[str, float]:
        prompt = (
            "Clasifica la frase del técnico de mantenimiento en un intent.\n"
            f"Intents válidos: {', '.join(_INTENTS)}.\n"
            'Responde SOLO JSON: {"intent": str, "confidence": 0-1}\n'
            f"Frase: {text!r}"
        )
        raw = self._client.chat_completion(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=128,
            response_format={"type": "json_object"},
        )
        parsed = OpenRouterClient.parse_json_object(raw)
        intent = str(parsed.get("intent", "unknown"))
        if intent not in _INTENTS:
            intent = "unknown"
        confidence_raw = parsed.get("confidence", 0.7)
        confidence = float(confidence_raw) if isinstance(confidence_raw, (int, float)) else 0.7
        return intent, max(0.0, min(confidence, 1.0))
