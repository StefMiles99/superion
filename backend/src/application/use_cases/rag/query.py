"""Use case RagQuery — BE-05."""

from __future__ import annotations

import re

from application.dto.rag import CitationDto, RagQueryOutput
from domain.exceptions import NotFoundError
from domain.ports.repositories import IAssetRepository, IManualChunkRepository, IManualRepository
from domain.ports.services import IEmbeddingService, IRerankerService
from domain.value_objects.citation import Citation
from domain.value_objects.manual_status import ManualStatus
from domain.value_objects.rag_result import RagResult


class RagQueryUseCase:
    """Retrieval híbrido + rerank mock + abstención por umbral."""

    def __init__(
        self,
        *,
        manuals: IManualRepository,
        chunks: IManualChunkRepository,
        assets: IAssetRepository,
        embeddings: IEmbeddingService,
        reranker: IRerankerService,
        top_k: int,
        top_n: int,
        abstain_threshold: float,
    ) -> None:
        self._manuals = manuals
        self._chunks = chunks
        self._assets = assets
        self._embeddings = embeddings
        self._reranker = reranker
        self._top_k = top_k
        self._top_n = top_n
        self._abstain_threshold = abstain_threshold

    async def execute(
        self,
        *,
        question: str,
        asset_id: str | None = None,
        asset_model: str | None = None,
        manual_version: int | None = None,
    ) -> RagQueryOutput:
        resolved_model = await self._resolve_asset_model(
            asset_id=asset_id,
            asset_model=asset_model,
        )
        manual = await self._find_manual(resolved_model, manual_version)
        if manual is None:
            raise NotFoundError(
                code="MANUAL_NOT_FOUND",
                message="No hay manual activo para el modelo indicado.",
                details={"asset_model": resolved_model},
            )

        query_embedding = self._embeddings.embed(question)
        candidates = await self._chunks.hybrid_search(
            manual_id=manual.id,
            question=question,
            query_embedding=query_embedding,
            top_k=self._top_k,
        )
        reranked = self._reranker.rerank(question, candidates)
        top = reranked[: self._top_n]

        if not top or not _has_term_overlap(question, top):
            confidence = top[0][1] if top else 0.0
            result = RagResult(
                answer="No tengo información suficiente en el manual para responder.",
                citations=(),
                confidence=confidence,
                abstained=True,
            )
            return _to_output(result)

        if top[0][1] < self._abstain_threshold:
            confidence = top[0][1] if top else 0.0
            result = RagResult(
                answer="No tengo información suficiente en el manual para responder.",
                citations=(),
                confidence=confidence,
                abstained=True,
            )
            return _to_output(result)

        # Filtra candidatos por umbral tras rerank
        qualified = [(chunk, score) for chunk, score in top if score >= self._abstain_threshold]
        if not qualified:
            result = RagResult(
                answer="No tengo información suficiente en el manual para responder.",
                citations=(),
                confidence=top[0][1],
                abstained=True,
            )
            return _to_output(result)

        citations: list[Citation] = []
        for chunk, _score in qualified:
            snippet = chunk.content.strip()
            if len(snippet) > 200:
                snippet = snippet[:197] + "..."
            citations.append(
                Citation(
                    manual_id=manual.id,
                    manual_version=manual.version,
                    page=chunk.page,
                    section_path=chunk.section_path,
                    chunk_id=chunk.id,
                    snippet=snippet,
                )
            )

        best_chunk = qualified[0][0]
        answer = _build_answer(question, best_chunk.content)
        result = RagResult(
            answer=answer,
            citations=tuple(citations),
            confidence=round(qualified[0][1], 2),
            abstained=False,
        )
        return _to_output(result)

    async def _resolve_asset_model(
        self,
        *,
        asset_id: str | None,
        asset_model: str | None,
    ) -> str:
        if asset_model:
            return asset_model
        if asset_id:
            asset = await self._assets.get_by_id(asset_id)
            if asset is None:
                raise NotFoundError(
                    code="NOT_FOUND",
                    message="Activo no encontrado.",
                    details={"id": asset_id},
                )
            return asset.model
        raise NotFoundError(
            code="VALIDATION_ERROR",
            message="asset_id o asset_model requerido.",
        )

    async def _find_manual(
        self,
        asset_model: str,
        manual_version: int | None,
    ):
        if manual_version is not None:
            for manual in await self._manuals.list_all():
                if (
                    manual.asset_model == asset_model
                    and manual.version == manual_version
                    and manual.status != ManualStatus.ARCHIVED
                ):
                    return manual
            return None
        return await self._manuals.get_active_by_asset_model(asset_model)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _has_term_overlap(question: str, candidates: list[tuple[object, float]]) -> bool:
    query_terms = set(_tokenize(question))
    if not query_terms:
        return False
    for chunk, _score in candidates:
        content = getattr(chunk, "content", "")
        content_terms = set(_tokenize(str(content)))
        if query_terms & content_terms:
            return True
    return False


def _build_answer(question: str, content: str) -> str:
    lowered_q = question.lower()
    if "torque" in lowered_q and "torque" in content.lower():
        for line in content.splitlines():
            if "torque" in line.lower():
                value = line.split(":", 1)[-1].strip() if ":" in line else line.strip()
                return f"El torque es {value.rstrip('.')}"
    return f"Según el manual: {content.strip()}"


def _to_output(result: RagResult) -> RagQueryOutput:
    return RagQueryOutput(
        answer=result.answer,
        citations=[
            CitationDto(
                manual_id=citation.manual_id,
                manual_version=citation.manual_version,
                page=citation.page,
                section_path=citation.section_path,
                chunk_id=citation.chunk_id,
                snippet=citation.snippet,
            )
            for citation in result.citations
        ],
        confidence=result.confidence,
        abstained=result.abstained,
    )
