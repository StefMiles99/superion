"""DTOs RAG — BE-05."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CitationDto(BaseModel):
    """Cita en respuesta RAG."""

    model_config = ConfigDict(extra="forbid")

    manual_id: str
    manual_version: int
    page: int
    section_path: str
    chunk_id: str
    snippet: str


class RagQueryOutput(BaseModel):
    """Respuesta query RAG — contrato query_manual."""

    model_config = ConfigDict(extra="forbid")

    answer: str
    citations: list[CitationDto] = Field(default_factory=list)
    confidence: float
    abstained: bool


class RagQueryInput(BaseModel):
    """Body POST /v1/internal/rag/query."""

    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=1)
    asset_id: str | None = None
    asset_model: str | None = None
    manual_version: int | None = None
