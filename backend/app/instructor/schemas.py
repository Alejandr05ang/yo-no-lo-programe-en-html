from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReviewBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    verdict: str
    note: str | None = ""


class ActiveSessionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    active_session_id: UUID | None = None


class InstructorCohortView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str
    starts_on: date | None
    ends_on: date | None
    is_active: bool
