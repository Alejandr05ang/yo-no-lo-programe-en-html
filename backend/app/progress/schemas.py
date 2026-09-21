from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProgressUpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str | None = None
    draft_code: str | None = None
    cases_passed: int | None = None
    cases_total: int | None = None


class ProgressView(BaseModel):
    cohort_id: UUID
    challenge_id: UUID
    status: str
    draft_code: str
    attempts_count: int
    cases_passed: int
    cases_total: int
    last_saved_at: datetime | None
    accepted_at: datetime | None


class SubmitBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code_submitted: str


class SubmitResponse(BaseModel):
    id: UUID
    attempt_number: int
    created_at: datetime
