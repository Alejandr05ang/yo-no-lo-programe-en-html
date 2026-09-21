from fastapi import APIRouter
from sqlalchemy import select

from app.auth.dependencies import CurrentUser
from app.db.models import DemoProgress
from app.db.session import SessionDep
from app.demo.schemas import DemoProgressBody, DemoProgressResponse

router = APIRouter(prefix="/api/demo", tags=["Demo"])

@router.get("/progress", response_model=DemoProgressResponse)
async def get_demo_progress(user: CurrentUser, session: SessionDep):
    progress = await session.scalar(select(DemoProgress).where(DemoProgress.user_id == user.id))
    if not progress:
        return DemoProgressResponse(schema_version=1, state={}, draft_code=None)
    
    return DemoProgressResponse(
        schema_version=progress.schema_version,
        state=progress.state_json,
        draft_code=progress.draft_code
    )

@router.put("/progress", response_model=DemoProgressResponse)
async def update_demo_progress(body: DemoProgressBody, user: CurrentUser, session: SessionDep):
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
            draft_code=body.draft_code
        )
        session.add(progress)
        
    await session.commit()
    
    return DemoProgressResponse(
        schema_version=progress.schema_version,
        state=progress.state_json,
        draft_code=progress.draft_code
    )