"""Router de manuales — BE-05."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status

from application.dto.manual import GetManualOutput, ListManualsOutput, SearchManualOutput
from application.dto.rag import RagQueryInput, RagQueryOutput
from application.use_cases.manuals.archive import ArchiveManualUseCase
from application.use_cases.manuals.get import GetManualUseCase
from application.use_cases.manuals.list import ListManualsUseCase
from application.use_cases.manuals.reindex import ReindexManualUseCase
from application.use_cases.manuals.search import SearchManualUseCase
from application.use_cases.manuals.upload import UploadManualUseCase
from domain.entities.user import User
from domain.value_objects.role import Role
from infrastructure.factories import (
    get_archive_manual_use_case,
    get_get_manual_use_case,
    get_list_manuals_use_case,
    get_rag_query_use_case,
    get_reindex_manual_use_case,
    get_search_manual_use_case,
    get_token_blacklist,
    get_token_service,
    get_upload_manual_use_case,
    get_user_repository,
)
from interface.http.deps.auth import get_current_user, require_role

router = APIRouter(tags=["manuals"])

require_rag_admin = require_role(Role.RAG_ADMIN)


@router.get("/v1/manuals")
async def list_manuals(
    _user: User = Depends(require_rag_admin),
    use_case: ListManualsUseCase = Depends(get_list_manuals_use_case),
) -> dict[str, object]:
    result: ListManualsOutput = await use_case.execute()
    return result.model_dump()


@router.post("/v1/manuals", status_code=status.HTTP_202_ACCEPTED)
async def upload_manual(
    title: str = Form(...),
    asset_model: str = Form(...),
    file: UploadFile = File(...),
    replaces_manual_id: str | None = Form(None),
    user: User = Depends(require_rag_admin),
    use_case: UploadManualUseCase = Depends(get_upload_manual_use_case),
) -> dict[str, object]:
    content = await file.read()
    content_type = file.content_type or "application/octet-stream"
    result = await use_case.execute(
        title=title,
        asset_model=asset_model,
        file_bytes=content,
        content_type=content_type,
        replaces_manual_id=replaces_manual_id,
        current_user=user,
    )
    return result.model_dump()


@router.get("/v1/manuals/{manual_id}")
async def get_manual(
    manual_id: str,
    _user: User = Depends(require_rag_admin),
    use_case: GetManualUseCase = Depends(get_get_manual_use_case),
) -> dict[str, object]:
    result: GetManualOutput = await use_case.execute(manual_id=manual_id)
    return result.model_dump()


@router.post("/v1/manuals/{manual_id}/reindex", status_code=status.HTTP_202_ACCEPTED)
async def reindex_manual(
    manual_id: str,
    _user: User = Depends(require_rag_admin),
    use_case: ReindexManualUseCase = Depends(get_reindex_manual_use_case),
) -> dict[str, object]:
    result = await use_case.execute(manual_id=manual_id)
    return result.model_dump()


@router.delete("/v1/manuals/{manual_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_manual(
    manual_id: str,
    _user: User = Depends(require_rag_admin),
    use_case: ArchiveManualUseCase = Depends(get_archive_manual_use_case),
) -> None:
    await use_case.execute(manual_id=manual_id)


@router.get("/v1/manuals/{manual_id}/search")
async def search_manual(
    manual_id: str,
    q: str = Query(..., min_length=1),
    _user: User = Depends(require_rag_admin),
    use_case: SearchManualUseCase = Depends(get_search_manual_use_case),
) -> dict[str, object]:
    result: SearchManualOutput = await use_case.execute(manual_id=manual_id, query=q)
    return result.model_dump()


@router.post("/v1/internal/rag/query")
async def rag_query(request: Request) -> dict[str, object]:
    authorization = request.headers.get("Authorization")
    await get_current_user(
        authorization=authorization,
        users=get_user_repository(),
        tokens=get_token_service(),
        blacklist=get_token_blacklist(),
    )
    body = RagQueryInput.model_validate(await request.json())
    use_case = get_rag_query_use_case()
    result: RagQueryOutput = await use_case.execute(
        question=body.question,
        asset_id=body.asset_id,
        asset_model=body.asset_model,
        manual_version=body.manual_version,
    )
    return result.model_dump()
