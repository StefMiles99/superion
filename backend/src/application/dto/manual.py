"""DTOs de manuales — BE-05."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class UploadManualOutput(BaseModel):
    """Respuesta POST /v1/manuals."""

    model_config = ConfigDict(extra="forbid")

    manual_id: str
    index_status: str
    estimated_seconds: int


class ManualUploaderDto(BaseModel):
    """Usuario que subió el manual."""

    model_config = ConfigDict(extra="forbid")

    id: str
    full_name: str


class ManualListItemDto(BaseModel):
    """Item en GET /v1/manuals."""

    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    asset_model: str
    version: int
    status: str
    index_status: str
    chunk_count: int
    uploaded_at: str
    uploaded_by: ManualUploaderDto


class ListManualsOutput(BaseModel):
    """Respuesta GET /v1/manuals."""

    model_config = ConfigDict(extra="forbid")

    items: list[ManualListItemDto]


class GetManualOutput(BaseModel):
    """Respuesta GET /v1/manuals/{id}."""

    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    asset_model: str
    version: int
    status: str
    index_status: str
    chunk_count: int
    uploaded_at: str
    uploaded_by: ManualUploaderDto
    download_url: str


class ReindexManualOutput(BaseModel):
    """Respuesta POST /v1/manuals/{id}/reindex."""

    model_config = ConfigDict(extra="forbid")

    manual_id: str
    index_status: str


class SearchChunkItemDto(BaseModel):
    """Item debug GET /v1/manuals/{id}/search."""

    model_config = ConfigDict(extra="forbid")

    chunk_id: str
    page: int
    section_path: str
    content: str
    score: float


class SearchManualOutput(BaseModel):
    """Respuesta GET /v1/manuals/{id}/search."""

    model_config = ConfigDict(extra="forbid")

    items: list[SearchChunkItemDto] = Field(default_factory=list)
