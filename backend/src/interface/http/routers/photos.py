"""Router de fotos — BE-04."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from application.dto.photo import GetPhotoOutput
from application.use_cases.photos.get import GetPhotoUseCase
from application.use_cases.photos.upload import UploadPhotoUseCase
from domain.entities.user import User
from infrastructure.factories import get_get_photo_use_case, get_upload_photo_use_case
from interface.http.deps.auth import get_current_user

router = APIRouter(tags=["photos"])


@router.post(
    "/v1/sessions/{session_id}/photos",
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_photo(
    session_id: str,
    step_index: int = Form(...),
    event_id: str = Form(...),
    file: UploadFile = File(...),
    criteria: str | None = Form(None),
    user: User = Depends(get_current_user),
    use_case: UploadPhotoUseCase = Depends(get_upload_photo_use_case),
) -> dict[str, object]:
    content = await file.read()
    content_type = file.content_type or "application/octet-stream"
    result = await use_case.execute(
        session_id=session_id,
        step_index=step_index,
        event_id=event_id,
        file_bytes=content,
        content_type=content_type,
        criteria=criteria,
        current_user=user,
    )
    return result.model_dump()


@router.get("/v1/photos/{photo_id}")
async def get_photo(
    photo_id: str,
    user: User = Depends(get_current_user),
    use_case: GetPhotoUseCase = Depends(get_get_photo_use_case),
) -> dict[str, object]:
    result: GetPhotoOutput = await use_case.execute(photo_id=photo_id, current_user=user)
    return result.model_dump()
