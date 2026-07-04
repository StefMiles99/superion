"""DTOs de fotos — BE-04."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class UploadPhotoOutput(BaseModel):
    """Respuesta 202 de POST /sessions/{id}/photos."""

    model_config = ConfigDict(extra="forbid")

    photo_id: str
    status: str
    uploaded_at: str


class GetPhotoOutput(BaseModel):
    """Respuesta 200 de GET /photos/{id}."""

    model_config = ConfigDict(extra="forbid")

    id: str
    session_id: str
    step_index: int
    thumbnail_url: str
    full_url: str
    validation_status: str
    validation_feedback: str | None = None
    captured_at: str
