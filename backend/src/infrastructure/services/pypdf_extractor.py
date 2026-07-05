"""Extractor PDF con pypdf — BE-05."""

from __future__ import annotations

from dataclasses import dataclass

from io import BytesIO

from pypdf import PdfReader


@dataclass(frozen=True, slots=True)
class ExtractedPage:
    page: int
    text: str


class PypdfExtractor:
    """Extrae texto paginado de PDFs reales."""

    def extract_pages(self, pdf_bytes: bytes) -> list[ExtractedPage]:
        if not pdf_bytes:
            return []
        reader = PdfReader(stream=BytesIO(pdf_bytes))
        pages: list[ExtractedPage] = []
        for index, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            stripped = text.strip()
            if stripped:
                pages.append(ExtractedPage(page=index, text=stripped))
        return pages
