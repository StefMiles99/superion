"""Exception handlers — envelope §1.8 — BE-00."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from domain.exceptions import (
    ConflictError,
    DomainError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
)
from infrastructure.errors import ErrorCode
from infrastructure.observability.logging import correlation_id_var


def _trace_id() -> str:
    return correlation_id_var.get() or "unknown"


def _error_envelope(
    *,
    code: str,
    message: str,
    details: dict[str, object] | None = None,
) -> dict[str, dict[str, object]]:
    error: dict[str, object] = {
        "code": code,
        "message": message,
        "trace_id": _trace_id(),
    }
    if details is not None:
        error["details"] = details
    return {"error": error}


_CONFLICT_CODES = frozenset({
    ErrorCode.WORK_ORDER_ALREADY_STARTED.value,
    ErrorCode.WORK_ORDER_ALREADY_COMPLETED.value,
    ErrorCode.SESSION_ALREADY_FINALIZED.value,
    ErrorCode.STEP_CRITICAL_CANNOT_SKIP.value,
    ErrorCode.STEP_REQUIRES_PHOTO.value,
})


def _status_for_domain_error(exc: DomainError) -> int:
    if isinstance(exc, UnauthorizedError):
        return 401
    if isinstance(exc, ConflictError) or exc.code in _CONFLICT_CODES:
        return 409
    if isinstance(exc, NotFoundError) or exc.code in (
        ErrorCode.NOT_FOUND.value,
        ErrorCode.WORK_ORDER_NOT_FOUND.value,
        ErrorCode.SESSION_NOT_FOUND.value,
        ErrorCode.PHOTO_NOT_FOUND.value,
        ErrorCode.MANUAL_NOT_FOUND.value,
    ):
        return 404
    if isinstance(exc, ValidationError) or exc.code in (
        ErrorCode.VALIDATION_ERROR.value,
        ErrorCode.PHOTO_VALIDATION_FAILED.value,
        ErrorCode.MANUAL_INVALID_PDF.value,
    ):
        return 422
    if isinstance(exc, ForbiddenError) or exc.code == ErrorCode.FORBIDDEN.value:
        return 403
    return 500


def register_exception_handlers(app: FastAPI) -> None:
    """Registra mapeo DomainError → envelope §1.8."""

    @app.exception_handler(DomainError)
    async def domain_error_handler(_request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=_status_for_domain_error(exc),
            content=_error_envelope(code=exc.code, message=exc.message, details=exc.details),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        if exc.status_code == 404:
            return JSONResponse(
                status_code=404,
                content=_error_envelope(
                    code=ErrorCode.NOT_FOUND.value,
                    message="Recurso no encontrado.",
                ),
            )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_envelope(
                code=ErrorCode.INTERNAL_ERROR.value,
                message=str(exc.detail),
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_envelope(
                code=ErrorCode.VALIDATION_ERROR.value,
                message="Datos de entrada inválidos.",
                details={"errors": exc.errors()},
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_error_envelope(
                code=ErrorCode.INTERNAL_ERROR.value,
                message="Error interno del servidor.",
            ),
        )
