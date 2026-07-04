"""DTOs de autenticación — BE-01."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1)


class RefreshInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=1)


class UserOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    email: str
    full_name: str
    role: str
    plant_id: str


class LoginOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_token: str
    refresh_token: str
    expires_in: int
    user: UserOutput


class MeOutput(UserOutput):
    """Respuesta de GET /v1/auth/me."""
