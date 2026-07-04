"""Router de audit log — BE-08."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from application.use_cases.audit.list import ListAuditEntriesUseCase
from domain.entities.user import User
from domain.value_objects.role import Role
from infrastructure.factories import get_list_audit_entries_use_case
from interface.http.deps.auth import require_role

router = APIRouter(prefix="/v1/audit", tags=["audit"])

require_rag_admin = require_role(Role.RAG_ADMIN)


@router.get("")
async def list_audit_entries(
    actor_user_id: Annotated[str | None, Query()] = None,
    action: Annotated[str | None, Query()] = None,
    target_type: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    cursor: Annotated[str | None, Query()] = None,
    _admin: User = Depends(require_rag_admin),
    use_case: ListAuditEntriesUseCase = Depends(get_list_audit_entries_use_case),
) -> dict[str, object]:
    result = await use_case.execute(
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        limit=limit,
        cursor=cursor,
    )
    return result.model_dump()
