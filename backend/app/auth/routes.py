from fastapi import APIRouter, Body, Request

from app.auth.dependencies import CurrentUser, IdentityDep
from app.auth.schemas import BootstrapBody, MeView, OnboardingView
from app.auth.service import bootstrap_user, me_view, onboarding_state
from app.db.session import SessionDep

router = APIRouter(prefix="/api", tags=["identity"])


@router.post("/auth/bootstrap", response_model=MeView)
async def bootstrap(
    request: Request,
    identity: IdentityDep,
    session: SessionDep,
    payload: BootstrapBody | None = Body(default=None),
):
    user = await bootstrap_user(session, identity)
    request.state.actor_id = str(user.id)
    return await me_view(session, user)


@router.get("/me", response_model=MeView)
async def me(user: CurrentUser, session: SessionDep):
    return await me_view(session, user)


@router.get("/me/onboarding", response_model=OnboardingView)
async def onboarding(user: CurrentUser, session: SessionDep):
    return await onboarding_state(session, user)
