"""Tests del use case HealthCheck — BE-00."""

import pytest

from application.use_cases.health import HealthCheck


@pytest.fixture
def health_check() -> HealthCheck:
    return HealthCheck(version="0.1.0")


async def test_health_check_returns_status_ok(health_check: HealthCheck) -> None:
    result = await health_check.execute()
    assert result["status"] == "ok"
    assert result["version"] == "0.1.0"
    assert result["deps"] == {}


async def test_health_check_uses_injected_version() -> None:
    health_check = HealthCheck(version="1.2.3")
    result = await health_check.execute()
    assert result["version"] == "1.2.3"
