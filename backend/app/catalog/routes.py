from uuid import UUID

from fastapi import APIRouter

from app.auth.dependencies import CurrentUser
from app.catalog.schemas import MapView, SessionDetail
from app.catalog.service import map_view, session_detail
from app.db.session import SessionDep

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("", response_model=MapView)
async def get_map(user: CurrentUser, session: SessionDep):
    return await map_view(session, user)


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: UUID, user: CurrentUser, session: SessionDep):
    return await session_detail(session, user, session_id)
