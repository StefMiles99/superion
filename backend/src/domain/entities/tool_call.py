"""Entidad ToolCall — BE-06."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class ToolCall:
    """Invocación de tool LangGraph/ElevenLabs sobre una sesión."""

    id: str
    name: str
    arguments: dict[str, object]
    session_id: str
    called_at: datetime
