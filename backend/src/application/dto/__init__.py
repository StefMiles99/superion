"""DTOs base de aplicación — BE-00."""

from pydantic import BaseModel, ConfigDict, Field


class HealthDTO(BaseModel):
    """Respuesta de liveness check."""

    model_config = ConfigDict(extra="forbid")

    status: str
    version: str
    deps: dict[str, str] = Field(default_factory=dict)


class ErrorDTO(BaseModel):
    """Envelope de error §1.8."""

    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    trace_id: str
    details: dict[str, object] | None = None
