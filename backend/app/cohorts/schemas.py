from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JoinCohortBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    code: Annotated[str, Field(min_length=8, max_length=80, pattern=r"^[A-Za-z0-9-]+$")]


class MembershipView(BaseModel):
    cohort_id: UUID
    cohort_name: str
    role: Literal["student", "instructor"]
    joined: bool
