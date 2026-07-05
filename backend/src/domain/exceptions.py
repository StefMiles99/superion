"""Excepciones de dominio — BE-00."""

from __future__ import annotations


class DomainError(Exception):
    """Error de negocio con código estable para mapeo HTTP."""

    def __init__(
        self,
        *,
        code: str,
        message: str,
        details: dict[str, object] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


class NotFoundError(DomainError):
    """Recurso no encontrado."""


class ValidationError(DomainError):
    """Datos de entrada inválidos."""


class ForbiddenError(DomainError):
    """Operación no permitida."""


class UnauthorizedError(DomainError):
    """Autenticación fallida o token inválido."""


class ConflictError(DomainError):
    """Conflicto de estado — HTTP 409."""


class ServiceUnavailableError(DomainError):
    """Servicio externo no disponible — HTTP 503."""


class RateLimitedError(DomainError):
    """Rate limit excedido — HTTP 429."""
