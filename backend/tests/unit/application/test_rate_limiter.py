"""Tests unitarios de rate limiter — BE-08."""

import pytest

from domain.exceptions import RateLimitedError
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.security.rate_limiter import InMemoryRateLimiter


@pytest.fixture
def clock() -> InMemoryClock:
    c = InMemoryClock()
    c.reset()
    return c


@pytest.fixture
def limiter(clock: InMemoryClock) -> InMemoryRateLimiter:
    return InMemoryRateLimiter(limit_per_minute=3, clock=clock)


async def test_allows_requests_up_to_limit(limiter: InMemoryRateLimiter) -> None:
    for _ in range(3):
        await limiter.check("user-1")


async def test_rejects_request_over_limit(limiter: InMemoryRateLimiter) -> None:
    for _ in range(3):
        await limiter.check("user-1")

    with pytest.raises(RateLimitedError) as exc_info:
        await limiter.check("user-1")

    assert exc_info.value.code == "RATE_LIMITED"


async def test_window_expires_allows_again(
    limiter: InMemoryRateLimiter,
    clock: InMemoryClock,
) -> None:
    for _ in range(3):
        await limiter.check("user-1")

    clock.advance(seconds=61)

    await limiter.check("user-1")
