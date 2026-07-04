"""Tests de entidad WorkOrder — BE-02."""

from datetime import UTC, datetime

import pytest

from domain.entities.user import User
from domain.entities.work_order import WorkOrder
from domain.exceptions import ConflictError, ValidationError
from domain.value_objects.role import Role
from domain.value_objects.status import WorkOrderStatus


def _order(*, status: WorkOrderStatus = WorkOrderStatus.PENDING) -> WorkOrder:
    return WorkOrder(
        id="wo-1",
        code="OT-1",
        asset_id="asset-1",
        type="preventive",
        priority="high",
        status=status,
        assigned_to="tech-1",
        planned_start=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        planned_end=datetime(2026, 7, 4, 15, 30, tzinfo=UTC),
        procedure_template_id="tmpl-1",
        created_at=datetime(2026, 7, 1, 8, 0, tzinfo=UTC),
    )


def test_work_order_start_transitions_pending_to_in_progress() -> None:
    order = _order()
    updated = order.start()
    assert updated.status == WorkOrderStatus.IN_PROGRESS
    assert order.status == WorkOrderStatus.PENDING


def test_work_order_start_rejects_completed() -> None:
    order = _order(status=WorkOrderStatus.COMPLETED)
    with pytest.raises(ConflictError) as exc_info:
        order.start()
    assert exc_info.value.code == "WORK_ORDER_ALREADY_COMPLETED"


def test_work_order_start_rejects_in_progress() -> None:
    order = _order(status=WorkOrderStatus.IN_PROGRESS)
    with pytest.raises(ConflictError) as exc_info:
        order.start()
    assert exc_info.value.code == "WORK_ORDER_ALREADY_STARTED"


def test_work_order_assign_to_validates_plant() -> None:
    order = _order()
    user = User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
    )
    assigned = order.assign_to(user, asset_plant_id="plant-1")
    assert assigned.assigned_to == "tech-1"

    with pytest.raises(ValidationError):
        order.assign_to(user, asset_plant_id="plant-2")


def test_work_order_rejects_invalid_type() -> None:
    with pytest.raises(ValueError, match="type"):
        WorkOrder(
            id="wo-x",
            code="OT-X",
            asset_id="asset-1",
            type="invalid",
            priority="high",
            status=WorkOrderStatus.PENDING,
            assigned_to="tech-1",
            planned_start=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
            planned_end=datetime(2026, 7, 4, 15, 30, tzinfo=UTC),
            procedure_template_id="tmpl-1",
            created_at=datetime(2026, 7, 1, 8, 0, tzinfo=UTC),
        )
