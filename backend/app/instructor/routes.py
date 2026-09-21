from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.auth.dependencies import CurrentUser, require_cohort_access, require_role
from app.core.errors import ApiError
from app.db.models import Cohort, CohortMembership, CohortState, Submission, SubmissionReview, User
from app.db.session import SessionDep
from app.instructor.schemas import ActiveSessionUpdate, ReviewBody

router = APIRouter(prefix="/api/instructor", tags=["instructor"], dependencies=[Depends(require_role("instructor", "admin"))])

@router.get("/cohorts")
async def list_instructor_cohorts(user: CurrentUser, session: SessionDep):
    if user.role == "admin":
        cohorts = await session.scalars(select(Cohort).order_by(Cohort.created_at.desc()))
    else:
        cohorts = await session.scalars(
            select(Cohort)
            .join(CohortMembership, CohortMembership.cohort_id == Cohort.id)
            .where(CohortMembership.user_id == user.id, CohortMembership.role == "instructor")
            .order_by(Cohort.created_at.desc())
        )
    return cohorts.all()


@router.get("/cohorts/{cohort_id}")
async def get_instructor_cohort(cohort_id: UUID, user: CurrentUser, session: SessionDep):
    await require_cohort_access(cohort_id, user, session, staff=True)
    cohort = await session.scalar(select(Cohort).where(Cohort.id == cohort_id))
    if not cohort:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")
    return cohort


@router.get("/cohorts/{cohort_id}/students")
async def get_instructor_cohort_students(cohort_id: UUID, user: CurrentUser, session: SessionDep):
    await require_cohort_access(cohort_id, user, session, staff=True)
    students = await session.scalars(
        select(User)
        .join(CohortMembership, User.id == CohortMembership.user_id)
        .where(CohortMembership.cohort_id == cohort_id, CohortMembership.role == "student")
    )
    return students.all()


@router.get("/submissions/{submission_id}")
async def get_submission(submission_id: UUID, user: CurrentUser, session: SessionDep):
    submission = await session.scalar(select(Submission).where(Submission.id == submission_id))
    if not submission:
        raise ApiError(404, "NOT_FOUND", "Entrega no encontrada.")
        
    await require_cohort_access(submission.cohort_id, user, session, staff=True)
    return submission


@router.post("/submissions/{submission_id}/review")
async def create_submission_review(submission_id: UUID, body: ReviewBody, user: CurrentUser, session: SessionDep):
    submission = await session.scalar(select(Submission).where(Submission.id == submission_id))
    if not submission:
        raise ApiError(404, "NOT_FOUND", "Entrega no encontrada.")
        
    await require_cohort_access(submission.cohort_id, user, session, staff=True)
    
    review = SubmissionReview(
        submission_id=submission.id,
        reviewer_id=user.id,
        verdict=body.verdict,
        note=body.note
    )
    session.add(review)
    await session.commit()
    
    return review


@router.patch("/cohorts/{cohort_id}/active-session")
async def update_cohort_active_session(cohort_id: UUID, body: ActiveSessionUpdate, user: CurrentUser, session: SessionDep):
    await require_cohort_access(cohort_id, user, session, staff=True)
    
    state = await session.scalar(select(CohortState).where(CohortState.cohort_id == cohort_id))
    if not state:
        state = CohortState(cohort_id=cohort_id)
        session.add(state)
        await session.flush()
        
    state.active_session_id = body.active_session_id
    state.updated_by = user.id
    
    await session.commit()
    return state
