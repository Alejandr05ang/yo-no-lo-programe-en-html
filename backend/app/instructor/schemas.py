from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReviewBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    verdict: str
    note: str | None = ""


class ActiveSessionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    active_session_id: UUID | None = None
