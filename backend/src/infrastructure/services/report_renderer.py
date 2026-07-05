"""MockReportRenderer — PDF mínimo válido — BE-07."""

from __future__ import annotations

import hashlib


class MockReportRenderer:
    """Genera PDF mock con header válido y texto del summary."""

    def render(self, content_json: dict[str, object]) -> tuple[bytes, str]:
        header = content_json.get("header", {})
        if isinstance(header, dict):
            ot_code = str(header.get("ot_code", "OT-UNKNOWN"))
        else:
            ot_code = "OT-UNKNOWN"
        summary = str(content_json.get("summary", ""))
        text = f"%PDF-1.4\n% Report OT {ot_code}\n{summary}\n%%EOF\n"
        pdf_bytes = text.encode("utf-8")
        sha = hashlib.sha256(pdf_bytes).hexdigest()
        return pdf_bytes, sha
