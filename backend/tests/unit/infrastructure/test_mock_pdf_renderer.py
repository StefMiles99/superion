"""Tests de MockReportRenderer — BE-07."""

import hashlib

from infrastructure.services.report_renderer import MockReportRenderer


def test_mock_pdf_renderer_produces_valid_bytes_and_sha256() -> None:
    content = {
        "header": {"ot_code": "OT-1001"},
        "summary": "Mantenimiento completado con 12 pasos.",
    }
    renderer = MockReportRenderer()
    pdf_bytes, sha = renderer.render(content)

    assert pdf_bytes.startswith(b"%PDF-1.4")
    assert b"OT-1001" in pdf_bytes
    assert b"Mantenimiento completado" in pdf_bytes
    assert sha == hashlib.sha256(pdf_bytes).hexdigest()
