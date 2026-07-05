"""Router de reportes — BE-07."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from application.use_cases.reports.get import GetReportUseCase
from application.use_cases.reports.get_pdf import GetReportPdfUseCase
from domain.entities.user import User
from infrastructure.factories import get_get_report_pdf_use_case, get_get_report_use_case
from interface.http.deps.auth import get_current_user

router = APIRouter(prefix="/v1/sessions", tags=["reports"])


@router.get("/{session_id}/report")
async def get_report(
    session_id: str,
    user: User = Depends(get_current_user),
    use_case: GetReportUseCase = Depends(get_get_report_use_case),
) -> dict[str, object]:
    result = await use_case.execute(session_id=session_id, current_user=user)
    return result.model_dump()


@router.get("/{session_id}/report/pdf")
async def get_report_pdf(
    session_id: str,
    user: User = Depends(get_current_user),
    use_case: GetReportPdfUseCase = Depends(get_get_report_pdf_use_case),
) -> Response:
    result = await use_case.execute(session_id=session_id, current_user=user)
    return Response(
        content=result.pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{result.filename}"',
            "X-Document-SHA256": result.sha256,
        },
    )
