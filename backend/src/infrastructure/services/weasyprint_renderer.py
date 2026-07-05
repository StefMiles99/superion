"""Report renderer WeasyPrint — BE-07."""

from __future__ import annotations

import hashlib
import html

from weasyprint import HTML


class WeasyPrintReportRenderer:
    """Genera PDF real desde content_json del reporte."""

    def render(self, content_json: dict[str, object]) -> tuple[bytes, str]:
        header = content_json.get("header", {})
        if not isinstance(header, dict):
            header = {}
        ot_code = html.escape(str(header.get("ot_code", "OT-UNKNOWN")))
        asset = html.escape(str(header.get("asset_name", "")))
        technician = html.escape(str(header.get("technician_name", "")))
        summary = html.escape(str(content_json.get("summary", "")))

        procedure_html = ""
        procedure = content_json.get("procedure")
        if isinstance(procedure, list):
            for step in procedure:
                if not isinstance(step, dict):
                    continue
                title = html.escape(str(step.get("title", "")))
                observations = step.get("observations", [])
                obs_lines = ""
                if isinstance(observations, list):
                    for obs in observations:
                        obs_lines += f"<li>{html.escape(str(obs))}</li>"
                procedure_html += (
                    f"<section><h3>{title}</h3><ul>{obs_lines}</ul></section>"
                )

        document = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Reporte {ot_code}</title></head>
<body>
  <h1>Reporte de mantenimiento — {ot_code}</h1>
  <p><strong>Activo:</strong> {asset}</p>
  <p><strong>Técnico:</strong> {technician}</p>
  <h2>Resumen</h2>
  <p>{summary}</p>
  <h2>Procedimiento</h2>
  {procedure_html}
</body>
</html>"""

        pdf_bytes = HTML(string=document).write_pdf()
        data = bytes(pdf_bytes) if pdf_bytes is not None else b""
        sha = hashlib.sha256(data).hexdigest()
        return data, sha
