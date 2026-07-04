"""Value objects de autenticación — BE-01."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class AccessToken:
    """Token de acceso JWT emitido."""

    value: str
    exp: datetime
    jti: str


@dataclass(frozen=True, slots=True)
class RefreshToken:
    """Token de refresh JWT emitido."""

    value: str
    exp: datetime
    jti: str
