"""Tests InMemoryEventBus — BE-03."""

import asyncio

import pytest

from infrastructure.realtime.event_bus import InMemoryEventBus


@pytest.fixture
async def bus() -> InMemoryEventBus:
    instance = InMemoryEventBus.shared()
    await instance.reset()
    return instance


async def test_publish_subscribe_delivers_message(bus: InMemoryEventBus) -> None:
    received: asyncio.Queue[dict[str, object]] = asyncio.Queue()

    async def handler(message: dict[str, object]) -> None:
        await received.put(message)

    await bus.subscribe("sess-1", handler)
    await bus.publish("sess-1", {"type": "session.paused", "seq": 1})

    msg = await asyncio.wait_for(received.get(), timeout=1)
    assert msg["type"] == "session.paused"


async def test_publish_only_to_subscribed_session(bus: InMemoryEventBus) -> None:
    received: asyncio.Queue[dict[str, object]] = asyncio.Queue()

    async def handler(message: dict[str, object]) -> None:
        await received.put(message)

    await bus.subscribe("sess-1", handler)
    await bus.publish("sess-2", {"type": "session.paused"})

    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(received.get(), timeout=0.2)
