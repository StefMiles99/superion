"""Middleware de correlation ID — BE-00."""

from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from infrastructure.observability.logging import correlation_id_var

CORRELATION_HEADER = "X-Correlation-Id"


class CorrelationMiddleware(BaseHTTPMiddleware):
    """Propaga o genera X-Correlation-Id en cada request."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        correlation_id = request.headers.get(CORRELATION_HEADER) or str(uuid.uuid4())
        token = correlation_id_var.set(correlation_id)
        try:
            response = await call_next(request)
            response.headers[CORRELATION_HEADER] = correlation_id
            return response
        finally:
            correlation_id_var.reset(token)
