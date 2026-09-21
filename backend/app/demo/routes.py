import json

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.dependencies import CurrentUser
from app.core.errors import ApiError
from app.db.models import DemoProgress
from app.db.session import SessionDep
from app.demo.schemas import (
    MAX_DRAFT_CODE_BYTES,
    MAX_STATE_BYTES,
    DemoProgressBody,
    DemoProgressResponse,
)

router = APIRouter(prefix="/api/demo", tags=["Demo"])


def reject_oversized(body: DemoProgressBody) -> None:
    """The demo is open to anyone signed in, before a cohort or a profile exists,
    so the row it writes is the least guarded one in the schema. Keep it small."""
    state_bytes = len(json.dumps(body.state, separators=(",", ":")).encode())
    if state_bytes > MAX_STATE_BYTES:
        raise ApiError(413, "PAYLOAD_TOO_LARGE", "El nivel de la demo es demasiado grande.")
    if body.draft_code and len(body.draft_code.encode()) > MAX_DRAFT_CODE_BYTES:
        raise ApiError(413, "PAYLOAD_TOO_LARGE", "El código de la demo es demasiado largo.")


@router.get("/progress", response_model=DemoProgressResponse)
async def get_demo_progress(user: CurrentUser, session: SessionDep):
    progress = await session.scalar(select(DemoProgress).where(DemoProgress.user_id == user.id))
    if not progress:
        return DemoProgressResponse(schema_version=1, state={}, draft_code=None, updated_at=None)

    return DemoProgressResponse(
        schema_version=progress.schema_version,
        state=progress.state_json,
        draft_code=progress.draft_code,
        updated_at=progress.updated_at,
    )


@router.put("/progress", response_model=DemoProgressResponse)
async def update_demo_progress(body: DemoProgressBody, user: CurrentUser, session: SessionDep):
    reject_oversized(body)

    # The row is keyed on the caller resolved from the Firebase token; a user id
    # from the client is never read.
    progress = await session.scalar(select(DemoProgress).where(DemoProgress.user_id == user.id))
    if progress:
        progress.schema_version = body.schema_version
        progress.state_json = body.state
        progress.draft_code = body.draft_code
    else:
        progress = DemoProgress(
            user_id=user.id,
            schema_version=body.schema_version,
            state_json=body.state,
            draft_code=body.draft_code,
        )
        session.add(progress)

    # updated_at is set by the database, so read it back rather than reporting
    # the value this process happened to hold before the write. Both steps stay
    # inside the transaction; after the commit the session has none to read on.
    await session.flush()
    await session.refresh(progress)
    await session.commit()

    return DemoProgressResponse(
        schema_version=progress.schema_version,
        state=progress.state_json,
        draft_code=progress.draft_code,
        updated_at=progress.updated_at,
    )
