"""Tracing ligero con correlation_id — BE-08."""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from infrastructure.observability.logging import correlation_id_var, get_logger

_logger = get_logger(__name__)


@asynccontextmanager
async def trace_span(name: str, **attrs: Any) -> AsyncIterator[dict[str, Any]]:
    """Registra span estructurado {name, start, duration_ms} en logs."""
    start = time.perf_counter()
    correlation_id = correlation_id_var.get()
    span: dict[str, Any] = {"name": name, "correlation_id": correlation_id, **attrs}
    try:
        yield span
    finally:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        span["duration_ms"] = duration_ms
        _logger.log(
            logging.INFO,
            f"span completed: {name}",
            extra={"span": span},
        )
