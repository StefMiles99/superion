"""DTO de envelope de error para OpenAPI — BE-08."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ErrorDetail(BaseModel):
    model_config = ConfigDict(extra="allow")

    code: str
    message: str
    trace_id: str
    details: dict[str, object] | None = None


class ErrorEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail


COMMON_ERROR_RESPONSES: dict[int, dict[str, object]] = {
    400: {"model": ErrorEnvelope, "description": "Solicitud mal formada"},
    401: {"model": ErrorEnvelope, "description": "No autenticado"},
    403: {"model": ErrorEnvelope, "description": "Prohibido"},
    404: {"model": ErrorEnvelope, "description": "No encontrado"},
    409: {"model": ErrorEnvelope, "description": "Conflicto"},
    422: {"model": ErrorEnvelope, "description": "Validación fallida"},
    429: {"model": ErrorEnvelope, "description": "Rate limit excedido"},
    500: {"model": ErrorEnvelope, "description": "Error interno"},
    503: {"model": ErrorEnvelope, "description": "Servicio no disponible"},
}
