"""Chunker jerárquico simple — BE-05."""

from __future__ import annotations

from dataclasses import dataclass

from domain.ports.services import PageText


@dataclass(frozen=True, slots=True)
class TextChunk:
    """Fragmento de texto con metadatos de página."""

    page: int
    section_path: str
    content: str


class HierarchicalChunker:
    """Parte cada página en chunks de N chars con overlap."""

    def __init__(self, *, chunk_size: int = 512, overlap: int = 64) -> None:
        if chunk_size <= 0:
            raise ValueError("chunk_size debe ser > 0")
        if overlap < 0 or overlap >= chunk_size:
            raise ValueError("overlap inválido")
        self._chunk_size = chunk_size
        self._overlap = overlap

    def chunk_pages(self, pages: list[PageText]) -> list[TextChunk]:
        chunks: list[TextChunk] = []
        for page in pages:
            section_path = f"page_{page.page}"
            text = page.text
            if not text:
                continue
            start = 0
            while start < len(text):
                end = min(start + self._chunk_size, len(text))
                content = text[start:end]
                if content.strip():
                    chunks.append(
                        TextChunk(page=page.page, section_path=section_path, content=content)
                    )
                if end >= len(text):
                    break
                start = end - self._overlap
        return chunks
