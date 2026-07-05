"""Contract tests OpenAPI con Schemathesis — BE-08."""

from __future__ import annotations

import schemathesis
from hypothesis import HealthCheck
from hypothesis import settings as hypothesis_settings
from schemathesis.specs.openapi.checks import (
    content_type_conformance,
    negative_data_rejection,
    positive_data_acceptance,
    unsupported_method,
)
from starlette.testclient import TestClient

from infrastructure.config import Settings
from interface.main import create_app

_test_settings = Settings(
    JWT_SECRET="test-secret-key-at-least-32-bytes-long",
    PASSWORD_BCRYPT_ROUNDS=4,
    RATE_LIMIT_ENABLED=False,
)
_test_app = create_app(_test_settings)
schema = schemathesis.openapi.from_asgi("/openapi.json", _test_app)

PUBLIC_PATHS = frozenset({
    "/health",
    "/ready",
    "/metrics",
    "/openapi.json",
    "/v1/auth/login",
    "/v1/auth/refresh",
})

ADMIN_PREFIXES = ("/v1/audit", "/v1/manuals", "/v1/internal/rag")

_tech_token: str | None = None
_admin_token: str | None = None


def _login(email: str, password: str) -> str:
    with TestClient(_test_app) as client:
        response = client.post(
            "/v1/auth/login",
            json={"email": email, "password": password},
        )
        return response.json()["access_token"]


def _tech_token() -> str:
    global _tech_token
    if _tech_token is None:
        _tech_token = _login("juan@planta.com", "test1234")
    return _tech_token


def _admin_token() -> str:
    global _admin_token
    if _admin_token is None:
        _admin_token = _login("admin@planta.com", "test1234")
    return _admin_token


@schemathesis.hook
def before_call(
    context: schemathesis.hooks.HookContext,
    case: schemathesis.Case,
    **kwargs: object,
) -> None:
    if case.path in PUBLIC_PATHS:
        return
    if case.path.startswith("/v1/elevenlabs/webhooks"):
        return

    headers = dict(case.headers or {})
    if any(k.lower() == "authorization" for k in headers):
        return

    if case.path.startswith(ADMIN_PREFIXES):
        headers["Authorization"] = f"Bearer {_admin_token()}"
    else:
        headers["Authorization"] = f"Bearer {_tech_token()}"
    case.headers = headers


@schema.parametrize()
@hypothesis_settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.filter_too_much],
)
def test_api_compliance(case: schemathesis.Case) -> None:
    if case.path.startswith("/v1/elevenlabs/webhooks"):
        return

    case.call_and_validate(
        excluded_checks=[
            unsupported_method,
            negative_data_rejection,
            positive_data_acceptance,
            content_type_conformance,
        ],
    )
