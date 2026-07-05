"""Cliente de conversación ElevenLabs real — BE-09."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from domain.ports.elevenlabs import VoiceConnectResult
from domain.ports.services import IClock


class ElevenLabsSdkConversationClient:
    """Obtiene signed_url o webrtc_token vía SDK oficial."""

    def __init__(
        self,
        *,
        api_key: str,
        clock: IClock,
        connect_mode: str = "signed_url",
    ) -> None:
        self._api_key = api_key
        self._clock = clock
        self._connect_mode = connect_mode

    def _client(self):
        try:
            from elevenlabs import AsyncElevenLabs
        except ImportError as exc:
            raise ValueError(
                "Instala extra elevenlabs: pip install -e '.[elevenlabs]'"
            ) from exc
        return AsyncElevenLabs(api_key=self._api_key)

    async def get_signed_url(
        self,
        agent_id: str,
        *,
        session_id: str,
        dynamic_variables: dict[str, str],
    ) -> VoiceConnectResult:
        client = self._client()
        if self._connect_mode == "webrtc":
            response = await client.conversational_ai.conversations.get_webrtc_token(
                agent_id=agent_id,
            )
            signed_url = getattr(response, "token", "") or ""
            connect_mode = "webrtc"
        else:
            response = await client.conversational_ai.conversations.get_signed_url(
                agent_id=agent_id,
            )
            signed_url = getattr(response, "signed_url", "") or ""
            connect_mode = "signed_url"

        expires_at = self._clock.now() + timedelta(minutes=15)
        if hasattr(response, "expires_at") and response.expires_at is not None:
            raw_expires = response.expires_at
            if isinstance(raw_expires, datetime):
                expires_at = raw_expires if raw_expires.tzinfo else raw_expires.replace(tzinfo=UTC)
            elif isinstance(raw_expires, (int, float)):
                expires_at = datetime.fromtimestamp(raw_expires, tz=UTC)

        return VoiceConnectResult(
            agent_id=agent_id,
            connect_mode=connect_mode,
            signed_url=signed_url,
            expires_at=expires_at,
            dynamic_variables=dynamic_variables,
        )
