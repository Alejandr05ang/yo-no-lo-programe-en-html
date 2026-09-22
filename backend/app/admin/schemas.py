from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DashboardMetrics(BaseModel):
    cohorts_count: int
    students_count: int


class CohortCreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = ""
    starts_on: date | None = None
    ends_on: date | None = None


class CohortUpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str | None = Field(None, min_length=2, max_length=100)
    slug: str | None = Field(
        None, min_length=2, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    description: str | None = None
    starts_on: date | None = None
    ends_on: date | None = None
    is_active: bool | None = None


class CohortCreateResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    join_code_plaintext: str


class ActiveSessionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    active_session_id: UUID | None = None


class RoleUpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    role: str = Field(..., pattern=r"^(student|instructor|admin)$")


class AdminAllowlistBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: str = Field(..., min_length=5, max_length=255)


class FeatureFlagUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool | None = None
    config: dict[str, Any] | None = None


class SessionCatalogItem(BaseModel):
    """Una sesion del catalogo, tal como la ve un administrador."""

    id: UUID
    code: str
    day_number: int
    order_index: int
    title: str
    teaser_summary: str
    is_published: bool
    challenges_count: int


class WorkshopState(BaseModel):
    """Estado del taller de una cohorte.

    active_session_id None es un estado valido y corriente: significa que todavia
    no se ha abierto ningun dia y los alumnos solo tienen la demo. El mapa lo
    traduce a order_index 0, con lo que ninguna sesion queda desbloqueada.
    """

    cohort_id: UUID
    cohort_name: str
    active_session_id: UUID | None
    active_session_code: str | None
    active_session_title: str | None
    active_order_index: int
    students_count: int
    updated_at: datetime | None
