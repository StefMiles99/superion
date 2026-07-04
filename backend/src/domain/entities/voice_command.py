"""Entidad VoiceCommand — BE-06."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class VoiceCommand:
    """Utterance clasificada del canal de voz."""

    session_id: str
    text: str
    intent: str
    confidence: float
    audio_ref: str | None = None
