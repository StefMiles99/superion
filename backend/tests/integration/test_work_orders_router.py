"""Tests de router work orders — BE-02."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


@pytest.fixture
def app():
    settings = Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
    )
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _login(client: AsyncClient) -> str:
    response = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    return response.json()["access_token"]


async def test_list_work_orders_returns_200(client: AsyncClient) -> None:
    token = await _login(client)
    response = await client.get(
        "/v1/work-orders",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 5
    assert body["items"][0]["code"].startswith("OT-")


async def test_list_work_orders_pending_filter(client: AsyncClient) -> None:
    token = await _login(client)
    response = await client.get(
        "/v1/work-orders?status=pending",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 3
    assert all(item["status"] == "pending" for item in items)


async def test_list_work_orders_pagination(client: AsyncClient) -> None:
    token = await _login(client)
    page1 = await client.get(
        "/v1/work-orders?limit=2",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert page1.status_code == 200
    body1 = page1.json()
    assert len(body1["items"]) == 2
    assert body1["next_cursor"] is not None

    page2 = await client.get(
        f"/v1/work-orders?limit=2&cursor={body1['next_cursor']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert page2.status_code == 200
    ids_page1 = {item["id"] for item in body1["items"]}
    ids_page2 = {item["id"] for item in page2.json()["items"]}
    assert ids_page1.isdisjoint(ids_page2)


async def test_get_work_order_returns_200(client: AsyncClient) -> None:
    token = await _login(client)
    response = await client.get(
        "/v1/work-orders/wo-001",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "wo-001"
    assert "description" in body
    assert "linked_wo_ids" in body


async def test_get_foreign_work_order_returns_404(client: AsyncClient) -> None:
    token = await _login(client)
    response = await client.get(
        "/v1/work-orders/wo-maria-1",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "WORK_ORDER_NOT_FOUND"


async def test_start_session_returns_201(client: AsyncClient) -> None:
    token = await _login(client)
    response = await client.post(
        "/v1/work-orders/wo-001/start",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["work_order_id"] == "wo-001"
    assert len(body["procedure_template"]["steps"]) == 12


async def test_start_session_twice_returns_same_session(client: AsyncClient) -> None:
    token = await _login(client)
    headers = {"Authorization": f"Bearer {token}"}
    first = await client.post("/v1/work-orders/wo-002/start", headers=headers)
    assert first.status_code == 201
    second = await client.post("/v1/work-orders/wo-002/start", headers=headers)
    assert second.status_code == 201
    assert second.json()["session_id"] == first.json()["session_id"]
