from typing import Any

from pydantic import BaseModel, Field


class DemoProgressBody(BaseModel):
    schema_version: int = Field(default=1)
    state: dict[str, Any]
    draft_code: str | None = None

class DemoProgressResponse(BaseModel):
    schema_version: int
    state: dict[str, Any]
    draft_code: str | None
