"""Tests chunker — BE-05."""

from infrastructure.services.chunker import HierarchicalChunker
from infrastructure.services.pdf_extractor import ExtractedPage


def test_chunker_produces_contiguous_chunks_with_section_path() -> None:
    chunker = HierarchicalChunker(chunk_size=20, overlap=5)
    pages = [
        ExtractedPage(page=1, text="ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
        ExtractedPage(page=2, text="pagina dos contenido"),
    ]
    chunks = chunker.chunk_pages(pages)

    assert len(chunks) >= 2
    assert chunks[0].section_path == "page_1"
    assert chunks[0].page == 1
    assert any(chunk.section_path == "page_2" for chunk in chunks)
    assert all(chunk.content for chunk in chunks)
