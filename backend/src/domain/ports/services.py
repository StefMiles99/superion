"""Ports de servicios de dominio — BE-01."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from domain.entities.user import User
from domain.value_objects.auth import AccessToken, RefreshToken


class IClock(Protocol):
    """Puerto de reloj inyectable."""

    def now(self) -> datetime: ...


class IPasswordHasher(Protocol):
    """Hash y verificación de contraseñas."""

    def hash(self, password: str) -> str: ...

    def verify(self, password: str, password_hash: str) -> bool: ...


class ITokenService(Protocol):
    """Emisión y validación de JWT."""

    def create_access_token(self, user: User) -> AccessToken: ...

    def create_refresh_token(self, user: User) -> RefreshToken: ...

    def decode_access_token(self, token: str) -> dict[str, Any]: ...

    def decode_refresh_token(self, token: str) -> dict[str, Any]: ...


class PhotoValidationResult(Protocol):
    """Resultado de validación VLM."""

    @property
    def ok(self) -> bool: ...

    @property
    def feedback(self) -> str: ...

    @property
    def confidence(self) -> float: ...

    @property
    def model_version(self) -> str: ...


class IPhotoValidator(Protocol):
    """Validación de fotos de evidencia (VLM mock o real)."""

    async def validate(self, image_bytes: bytes, criteria: str) -> PhotoValidationResult: ...
