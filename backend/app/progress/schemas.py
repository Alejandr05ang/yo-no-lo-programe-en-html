from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProgressUpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # not_started no se escribe: es la ausencia de fila.
    status: Literal["draft", "in_progress", "accepted"] | None = None
    draft_code: str | None = None
    cases_passed: int | None = Field(None, ge=0)
    cases_total: int | None = Field(None, ge=0)

    @model_validator(mode="after")
    def accepted_needs_all_cases(self):
        # La revision corre en el navegador; esto no la hace segura, pero impide
        # marcar aceptado un reto sin haber pasado la revision que lo acepta.
        if self.status == "accepted" and not (
            self.cases_total and self.cases_passed == self.cases_total
        ):
            raise ValueError("accepted requires every case to pass")
        return self


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
