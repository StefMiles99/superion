"""Router webhook ElevenLabs — BE-06."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request

from application.dto.webhook import WebhookEventOutput
from application.use_cases.voice.handle_webhook import HandleWebhookUseCase
from infrastructure.factories import get_handle_webhook_use_case

router = APIRouter(prefix="/v1/elevenlabs", tags=["elevenlabs"])


@router.post("/webhooks/conversation", response_model=WebhookEventOutput)
async def conversation_webhook(
    request: Request,
    signature: Annotated[str | None, Header(alias="X-ElevenLabs-Signature")] = None,
    use_case: HandleWebhookUseCase = Depends(get_handle_webhook_use_case),
) -> WebhookEventOutput:
    """Recibe eventos de conversación ElevenLabs con verificación HMAC."""
    raw_body = await request.body()
    return await use_case.execute(
        raw_body=raw_body,
        signature_header=signature,
        current_user=None,
    )
