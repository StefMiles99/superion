"""Tests Citation — BE-05."""

import pytest

from domain.value_objects.citation import Citation


def test_citation_is_immutable() -> None:
    citation = Citation(
        manual_id="manual-1",
        manual_version=2,
        page=5,
        section_path="page_5",
        chunk_id="chunk-1",
        snippet="Torque 85 Nm",
    )
    with pytest.raises(AttributeError):
        citation.page = 6  # type: ignore[misc]


def test_citation_requires_snippet() -> None:
    with pytest.raises(ValueError, match="snippet"):
        Citation(
            manual_id="m1",
            manual_version=1,
            page=1,
            section_path="page_1",
            chunk_id="c1",
            snippet="",
        )
