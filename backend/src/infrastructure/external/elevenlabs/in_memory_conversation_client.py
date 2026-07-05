"""Cliente de conversación in-memory — BE-09."""

from __future__ import annotations

from datetime import timedelta

from domain.ports.elevenlabs import VoiceConnectResult
from domain.ports.services import IClock


class InMemoryConversationClient:
    """Devuelve signed_url sintética para tests."""

    def __init__(self, *, clock: IClock, agent_id: str) -> None:
        self._clock = clock
        self._agent_id = agent_id

    async def get_signed_url(
        self,
        agent_id: str,
        *,
        session_id: str,
        dynamic_variables: dict[str, str],
    ) -> VoiceConnectResult:
        expires_at = self._clock.now() + timedelta(minutes=15)
        return VoiceConnectResult(
            agent_id=agent_id or self._agent_id,
            connect_mode="signed_url",
            signed_url=f"wss://mock.elevenlabs.test/{agent_id}/{session_id}",
            expires_at=expires_at,
            dynamic_variables=dynamic_variables,
        )
