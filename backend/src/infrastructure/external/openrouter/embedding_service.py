"""Embeddings vía OpenRouter — BE-05."""

from __future__ import annotations

from infrastructure.external.openrouter.client import OpenRouterClient


class OpenRouterEmbeddingService:
    """Genera vectores con modelos de embedding en OpenRouter."""

    def __init__(
        self,
        *,
        client: OpenRouterClient,
        model: str,
        dimensions: int,
    ) -> None:
        self._client = client
        self._model = model
        self._dimensions = dimensions

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def embed(self, text: str) -> tuple[float, ...]:
        vectors = self._client.embeddings(model=self._model, texts=[text])
        return tuple(vectors[0])

    def embed_batch(self, texts: list[str]) -> list[tuple[float, ...]]:
        if not texts:
            return []
        vectors = self._client.embeddings(model=self._model, texts=texts)
        return [tuple(row) for row in vectors]
