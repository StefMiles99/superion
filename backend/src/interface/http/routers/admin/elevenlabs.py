"""Router admin ElevenLabs — BE-09."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from application.use_cases.elevenlabs.get_provision_status import GetProvisionStatusUseCase
from domain.entities.user import User
from domain.value_objects.role import Role
from infrastructure.factories import get_provision_status_use_case
from interface.http.deps.auth import require_role

router = APIRouter(prefix="/v1/admin/elevenlabs", tags=["admin", "elevenlabs"])

require_admin = require_role(Role.SUPERVISOR, Role.RAG_ADMIN)


@router.get("/agent/status")
async def get_agent_status(
    _admin: User = Depends(require_admin),
    use_case: GetProvisionStatusUseCase = Depends(get_provision_status_use_case),
) -> dict[str, object]:
    result = await use_case.execute()
    return result.model_dump()
