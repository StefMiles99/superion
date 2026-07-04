"""Router de autenticación — BE-01."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response, status

from application.dto.auth import LoginInput, RefreshInput
from application.use_cases.auth.get_me import GetMeUseCase
from application.use_cases.auth.login import LoginUseCase
from application.use_cases.auth.logout import LogoutUseCase
from application.use_cases.auth.refresh import RefreshUseCase
from domain.entities.user import User
from domain.exceptions import UnauthorizedError
from infrastructure.factories import (
    get_login_use_case,
    get_logout_use_case,
    get_me_use_case,
    get_refresh_use_case,
)
from interface.http.deps.auth import get_current_user

router = APIRouter(prefix="/v1/auth", tags=["auth"])


def _extract_bearer_token(authorization: str | None) -> str:
    if authorization is None or not authorization.startswith("Bearer "):
        raise UnauthorizedError(code="UNAUTHORIZED", message="Autenticación requerida.")
    return authorization.removeprefix("Bearer ").strip()


@router.post("/login")
async def login(
    body: LoginInput,
    use_case: LoginUseCase = Depends(get_login_use_case),
) -> dict[str, object]:
    result = await use_case.execute(body)
    return result.model_dump()


@router.post("/refresh")
async def refresh(
    body: RefreshInput,
    use_case: RefreshUseCase = Depends(get_refresh_use_case),
) -> dict[str, object]:
    result = await use_case.execute(body)
    return result.model_dump()


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    use_case: LogoutUseCase = Depends(get_logout_use_case),
) -> Response:
    token = _extract_bearer_token(authorization)
    await use_case.execute(access_token=token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me")
async def me(
    user: User = Depends(get_current_user),
    use_case: GetMeUseCase = Depends(get_me_use_case),
) -> dict[str, str]:
    result = await use_case.execute(user.id)
    return result.model_dump()
