"""Middleware de rate limiting — BE-08."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from domain.exceptions import RateLimitedError
from infrastructure.factories import (
    get_rate_limiter,
    get_settings,
    get_token_blacklist,
    get_token_service,
    get_user_repository,
)
from infrastructure.observability.metrics import InMemoryMetricsCollector

EXEMPT_PATHS = frozenset({
    "/health",
    "/ready",
    "/metrics",
    "/openapi.json",
    "/v1/auth/login",
    "/v1/auth/refresh",
})


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Aplica rate limit por user_id en requests autenticados."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        if request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        user_id = await self._resolve_user_id(request)
        if user_id is None:
            return await call_next(request)

        limiter = get_rate_limiter()
        try:
            await limiter.check(user_id)
        except RateLimitedError as exc:
            collector = InMemoryMetricsCollector.shared()
            collector.counter(
                "http_requests_rate_limited_total",
                "Total HTTP requests rejected by rate limiter",
            ).inc()
            from interface.http.exception_handlers import _error_envelope

            return JSONResponse(
                status_code=429,
                content=_error_envelope(
                    code=exc.code,
                    message=exc.message,
                    details=exc.details,
                ),
            )

        response = await call_next(request)
        collector = InMemoryMetricsCollector.shared()
        collector.counter(
            "http_requests_total",
            "Total HTTP requests",
            labels={"method": request.method, "status": str(response.status_code)},
        ).inc()
        return response

    @staticmethod
    async def _resolve_user_id(request: Request) -> str | None:
        authorization = request.headers.get("Authorization")
        if authorization is None or not authorization.startswith("Bearer "):
            return None

        token = authorization.removeprefix("Bearer ").strip()
        tokens = get_token_service()
        blacklist = get_token_blacklist()
        users = get_user_repository()

        try:
            payload = tokens.decode_access_token(token)
        except Exception:
            return None

        jti = str(payload["jti"])
        if await blacklist.is_revoked(jti):
            return None

        user = await users.get_by_id(str(payload["sub"]))
        if user is None or user.is_blocked:
            return None
        return user.id
