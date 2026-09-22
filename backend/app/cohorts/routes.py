from fastapi import APIRouter, Request

from app.auth.dependencies import CurrentUser
from app.cohorts.schemas import JoinCohortBody, MembershipView
from app.cohorts.service import JoinAttemptLimiter, join_cohort
from app.db.session import SessionDep

router = APIRouter(prefix="/api/cohorts", tags=["cohorts"])


@router.post("/join", response_model=MembershipView)
async def join(request: Request, payload: JoinCohortBody, user: CurrentUser, session: SessionDep):
    limiter: JoinAttemptLimiter = request.app.state.join_attempt_limiter
    limiter.check(user.id)
    cohort, membership, joined = await join_cohort(session, user, payload.code)
    return MembershipView(
        cohort_id=cohort.id, cohort_name=cohort.name, role=membership.role, joined=joined
    )
