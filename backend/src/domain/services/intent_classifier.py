"""Clasificador de intents mock por keywords — BE-06."""

from __future__ import annotations

import re

KEYWORDS: dict[str, str] = {
    r"\b(siguiente|avanzar|pr[oó]ximo)\b": "advance",
    r"\b(repetir|otra vez)\b": "repeat",
    r"\b(saltar)\b": "skip",
    r"\b(pausar|alto)\b": "pause",
    r"\b(cu[aá]l|qu[eé]|por qu[eé]|c[oó]mo)\b": "query",
    r"\b(\d+(\.\d+)?)\s*(psi|bar|n\.?m|kg)\b": "measurement",
    r"\b(fuga|da[ñn]o|problema|falla|roto|grieta|anomal[ií]a)\b": "finding",
}


class MockIntentClassifier:
    """Clasifica utterances por regex — suficiente para E2E mock."""

    def classify(self, text: str) -> tuple[str, float]:
        """Devuelve (intent, confidence)."""
        lowered = text.lower().strip()
        for pattern, intent in KEYWORDS.items():
            if re.search(pattern, lowered, flags=re.IGNORECASE):
                return intent, 0.9
        if len(lowered) >= 3:
            return "narration", 0.7
        return "unknown", 0.3
