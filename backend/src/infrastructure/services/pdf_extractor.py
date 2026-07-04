"""Extractor PDF mock — BE-05."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ExtractedPage:
    """Página extraída de un PDF."""

    page: int
    text: str


class MockPdfExtractor:
    """Divide bytes latin-1 por form-feed; sin \\f → página única."""

    def extract_pages(self, pdf_bytes: bytes) -> list[ExtractedPage]:
        if not pdf_bytes:
            return []
        text = pdf_bytes.decode("latin-1", errors="replace")
        raw_pages = text.split("\f")
        if len(raw_pages) == 1 and raw_pages[0] == text:
            stripped = text.strip()
            if not stripped:
                return []
            return [ExtractedPage(page=1, text=stripped)]
        pages: list[ExtractedPage] = []
        for index, page_text in enumerate(raw_pages, start=1):
            stripped = page_text.strip()
            if stripped:
                pages.append(ExtractedPage(page=index, text=stripped))
        return pages
