"""Use case ConnectSession — BE-09."""

from __future__ import annotations

from application.dto.elevenlabs import VoiceConnectOutput
from domain.entities.user import User
from domain.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from domain.ports.elevenlabs import IElevenLabsConversationClient
from domain.ports.repositories import IAssetRepository, ISessionRepository, IWorkOrderRepository
from domain.value_objects.status import SessionStatus


class ConnectSessionUseCase:
    """Emite signed_url para iniciar voz en sesión activa."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        work_orders: IWorkOrderRepository,
        assets: IAssetRepository,
        conversation_client: IElevenLabsConversationClient,
        agent_id: str,
        connect_mode: str = "signed_url",
    ) -> None:
        self._sessions = sessions
        self._work_orders = work_orders
        self._assets = assets
        self._conversation_client = conversation_client
        self._agent_id = agent_id
        self._connect_mode = connect_mode

    async def execute(self, *, session_id: str, current_user: User) -> VoiceConnectOutput:
        if not self._agent_id.strip():
            raise ValidationError(
                code="AGENT_NOT_PROVISIONED",
                message="El agente ElevenLabs no está provisionado.",
            )

        session = await self._sessions.get_by_id(session_id)
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"session_id": session_id},
            )
        if session.technician_id != current_user.id:
            raise ForbiddenError(
                code="FORBIDDEN",
                message="No tienes acceso a esta sesión.",
            )
        if session.status not in (SessionStatus.ACTIVE, SessionStatus.PAUSED):
            raise ConflictError(
                code="SESSION_NOT_ACTIVE",
                message="La sesión no está activa.",
                details={"status": session.status.value},
            )

        work_order = await self._work_orders.get_by_id_for_technician(
            session.work_order_id,
            technician_id=current_user.id,
        )
        work_order_code = work_order.code if work_order else ""
        asset_tag = ""
        asset_model = ""
        asset_name = ""
        asset_id = work_order.asset_id if work_order else ""
        if work_order:
            asset = await self._assets.get_by_id(work_order.asset_id)
            if asset:
                asset_tag = asset.tag
                asset_model = asset.model
                asset_name = asset.name

        dynamic_variables = {
            "session_id": session_id,
            "work_order_code": work_order_code,
            "asset_tag": asset_tag,
            "asset_id": asset_id,
            "asset_model": asset_model,
            "asset_name": asset_name,
        }
        result = await self._conversation_client.get_signed_url(
            self._agent_id,
            session_id=session_id,
            dynamic_variables=dynamic_variables,
        )
        return VoiceConnectOutput(
            agent_id=result.agent_id,
            connect_mode=self._connect_mode,
            signed_url=result.signed_url,
            expires_at=result.expires_at.isoformat().replace("+00:00", "Z"),
            dynamic_variables=result.dynamic_variables,
        )
