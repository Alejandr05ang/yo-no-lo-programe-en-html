from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# A saved demo level is a few kB of JSON. These caps are generous next to that
# and still small enough that one row per student cannot grow into a storage
# problem; the global request ceiling is megabytes wide and far too loose here.
MAX_STATE_BYTES = 128 * 1024
MAX_DRAFT_CODE_BYTES = 64 * 1024


class DemoProgressBody(BaseModel):
    schema_version: int = Field(default=1, ge=1)
    state: dict[str, Any]
    draft_code: str | None = None


class DemoProgressResponse(BaseModel):
    schema_version: int
    state: dict[str, Any]
    draft_code: str | None
    # Null until the student's first save. The client uses it to tell a restored
    # level apart from an empty one without guessing.
    updated_at: datetime | None = None
