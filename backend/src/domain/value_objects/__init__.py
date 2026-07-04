"""Value objects y ports ligeros de dominio."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol


class Clock(Protocol):
    """Puerto de reloj inyectable para lógica testeable."""

    def now(self) -> datetime: ...
