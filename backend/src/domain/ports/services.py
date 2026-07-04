"""Ports de servicios de dominio — BE-01."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from domain.entities.user import User
from domain.value_objects.auth import AccessToken, RefreshToken


class IClock(Protocol):
    """Puerto de reloj inyectable."""

    def now(self) -> datetime: ...


class IPasswordHasher(Protocol):
    """Hash y verificación de contraseñas."""

    def hash(self, password: str) -> str: ...

    def verify(self, password: str, password_hash: str) -> bool: ...


class ITokenService(Protocol):
    """Emisión y validación de JWT."""

    def create_access_token(self, user: User) -> AccessToken: ...

    def create_refresh_token(self, user: User) -> RefreshToken: ...

    def decode_access_token(self, token: str) -> dict[str, Any]: ...

    def decode_refresh_token(self, token: str) -> dict[str, Any]: ...


class PhotoValidationResult(Protocol):
    """Resultado de validación VLM."""

    @property
    def ok(self) -> bool: ...

    @property
    def feedback(self) -> str: ...

    @property
    def confidence(self) -> float: ...

    @property
    def model_version(self) -> str: ...


class IPhotoValidator(Protocol):
    """Validación de fotos de evidencia (VLM mock o real)."""

    async def validate(self, image_bytes: bytes, criteria: str) -> PhotoValidationResult: ...


class PageText(Protocol):
    """Texto extraído de una página PDF."""

    @property
    def page(self) -> int: ...

    @property
    def text(self) -> str: ...


class TextChunkData(Protocol):
    """Fragmento de texto antes de embedding."""

    @property
    def page(self) -> int: ...

    @property
    def section_path(self) -> str: ...

    @property
    def content(self) -> str: ...


class IPdfExtractor(Protocol):
    """Extracción de texto de PDF."""

    def extract_pages(self, pdf_bytes: bytes) -> list[PageText]: ...


class IChunkerService(Protocol):
    """Chunking jerárquico de páginas."""

    def chunk_pages(self, pages: list[PageText]) -> list[TextChunkData]: ...


class IEmbeddingService(Protocol):
    """Generación de embeddings."""

    def embed(self, text: str) -> tuple[float, ...]: ...

    def embed_batch(self, texts: list[str]) -> list[tuple[float, ...]]: ...

    @property
    def dimensions(self) -> int: ...


class ScoredChunk(Protocol):
    """Chunk con score de retrieval."""

    @property
    def chunk(self) -> object: ...

    @property
    def score(self) -> float: ...


class IRerankerService(Protocol):
    """Reordenación de candidatos RAG."""

    def rerank(
        self,
        question: str,
        candidates: list[tuple[object, float]],
    ) -> list[tuple[object, float]]: ...


class IIntentClassifier(Protocol):
    """Clasifica utterance → intent."""

    def classify(self, text: str) -> tuple[str, float]: ...


class ILangGraphClient(Protocol):
    """Cliente LangGraph — mock o real."""

    async def invoke(
        self,
        *,
        session_id: str,
        tool_name: str,
        arguments: dict[str, object],
        current_user: object,
    ) -> dict[str, object]: ...

    async def ensure_session(self, session_id: str, *, current_step_index: int = 0) -> None: ...

    async def get_state(self, session_id: str) -> dict[str, object] | None: ...


class ISignatureValidator(Protocol):
    """Validación HMAC de webhooks."""

    def validate(self, *, payload: bytes, signature_header: str | None) -> None: ...
