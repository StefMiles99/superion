"""Router de work orders — BE-02."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from application.use_cases.work_orders.get import GetWorkOrderUseCase
from application.use_cases.work_orders.list import ListWorkOrdersUseCase
from application.use_cases.work_orders.start_session import StartSessionUseCase
from domain.entities.user import User
from infrastructure.factories import (
    get_list_work_orders_use_case,
    get_start_session_use_case,
    get_work_order_use_case,
)
from interface.http.deps.auth import get_current_user

router = APIRouter(prefix="/v1/work-orders", tags=["work-orders"])


@router.get("")
async def list_work_orders(
    user: User = Depends(get_current_user),
    use_case: ListWorkOrdersUseCase = Depends(get_list_work_orders_use_case),
    status_filter: Annotated[list[str] | None, Query(alias="status")] = None,
    assigned_to: str | None = None,
    priority: str | None = None,
    asset_id: str | None = None,
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
) -> dict[str, object]:
    result = await use_case.execute(
        current_user=user,
        assigned_to=assigned_to,
        statuses=status_filter,
        priority=priority,
        asset_id=asset_id,
        cursor=cursor,
        limit=limit,
    )
    return result.model_dump()


@router.get("/{work_order_id}")
async def get_work_order(
    work_order_id: str,
    user: User = Depends(get_current_user),
    use_case: GetWorkOrderUseCase = Depends(get_work_order_use_case),
) -> dict[str, object]:
    result = await use_case.execute(work_order_id=work_order_id, current_user=user)
    return result.model_dump()


@router.post("/{work_order_id}/start", status_code=status.HTTP_201_CREATED)
async def start_session(
    work_order_id: str,
    user: User = Depends(get_current_user),
    use_case: StartSessionUseCase = Depends(get_start_session_use_case),
) -> dict[str, object]:
    result = await use_case.execute(work_order_id=work_order_id, current_user=user)
    return result.model_dump()
