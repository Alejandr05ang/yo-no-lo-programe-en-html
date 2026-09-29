from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.admin.routes import create_audit_log
from app.auth.dependencies import CurrentUser, require_cohort_access, require_role
from app.core.errors import ApiError
from app.db.models import (
    Cohort,
    CohortMembership,
    CohortSessionOverride,
    CohortState,
    SessionCatalog,
    Submission,
    SubmissionReview,
    User,
)
from app.db.session import SessionDep
from app.instructor.schemas import (
    ActiveSessionUpdate,
    InstructorCohortView,
    InstructorStudentView,
    MembershipStatusUpdate,
    ReviewBody,
)

router = APIRouter(
    prefix="/api/instructor",
    tags=["instructor"],
    dependencies=[Depends(require_role("instructor", "admin"))],
)

@router.get("/cohorts", response_model=list[InstructorCohortView])
async def list_instructor_cohorts(user: CurrentUser, session: SessionDep):
    if user.role == "admin":
        cohorts = await session.scalars(select(Cohort).order_by(Cohort.created_at.desc()))
    else:
        cohorts = await session.scalars(
            select(Cohort)
            .join(CohortMembership, CohortMembership.cohort_id == Cohort.id)
            .where(
                CohortMembership.user_id == user.id,
                CohortMembership.role == "instructor",
                CohortMembership.status == "active",
                Cohort.is_active.is_(True),
            )
            .order_by(Cohort.created_at.desc())
        )
    return cohorts.all()

@router.get("/cohorts/{cohort_id}", response_model=InstructorCohortView)
async def get_instructor_cohort(cohort_id: UUID, user: CurrentUser, session: SessionDep):
    await require_cohort_access(cohort_id, user, session, staff=True)
    cohort = await session.scalar(select(Cohort).where(Cohort.id == cohort_id))
    if not cohort:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")
    return cohort

def student_view(student: User, membership: CohortMembership) -> InstructorStudentView:
    return InstructorStudentView(
        id=student.id,
        email=student.email,
        full_name=student.full_name,
        display_name=student.display_name,
        joined_at=membership.joined_at,
        status=membership.status,
    )


@router.get("/cohorts/{cohort_id}/students", response_model=list[InstructorStudentView])
async def get_instructor_cohort_students(cohort_id: UUID, user: CurrentUser, session: SessionDep):
    await require_cohort_access(cohort_id, user, session, staff=True)
    if await session.get(Cohort, cohort_id) is None:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")
    students = await session.execute(
        select(User, CohortMembership)
        .join(CohortMembership, User.id == CohortMembership.user_id)
        .where(
            CohortMembership.cohort_id == cohort_id,
            CohortMembership.role == "student",
            User.role == "student",
        )
        .order_by(CohortMembership.joined_at, User.id)
    )
    return [student_view(student, membership) for student, membership in students]


@router.patch(
    "/cohorts/{cohort_id}/students/{user_id}/membership",
    response_model=InstructorStudentView,
)
async def update_student_membership(
    cohort_id: UUID,
    user_id: UUID,
    body: MembershipStatusUpdate,
    user: CurrentUser,
    session: SessionDep,
):
    await require_cohort_access(cohort_id, user, session, staff=True)
    cohort = await session.get(Cohort, cohort_id)
    if cohort is None:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")
    if not cohort.is_active:
        raise ApiError(409, "COHORT_INACTIVE", "Activa la clase antes de cambiar sus matrículas.")

    row = (
        await session.execute(
            select(User, CohortMembership)
            .join(CohortMembership, User.id == CohortMembership.user_id)
            .where(
                CohortMembership.cohort_id == cohort_id,
                CohortMembership.user_id == user_id,
                CohortMembership.role == "student",
                User.role == "student",
            )
            .with_for_update(of=CohortMembership)
        )
    ).first()
    if row is None:
        raise ApiError(404, "NOT_FOUND", "No se encontró esa matrícula de estudiante.")
    student, membership = row
    if membership.status == "pending":
        raise ApiError(409, "MEMBERSHIP_PENDING", "La matrícula todavía está pendiente de aprobación.")
    if membership.status != body.status:
        before = {"status": membership.status}
        membership.status = body.status
        await create_audit_log(
            session,
            user.id,
            "REACTIVATE_STUDENT" if body.status == "active" else "REMOVE_STUDENT",
            "cohort_membership",
            f"{cohort_id}:{user_id}",
            before,
            {"status": membership.status},
        )
        # SessionDep commits the membership and audit together before sending a response.
        await session.flush()
    return student_view(student, membership)

@router.get("/submissions/{submission_id}")
async def get_submission(submission_id: UUID, user: CurrentUser, session: SessionDep):
    submission = await session.scalar(select(Submission).where(Submission.id == submission_id))
    if not submission:
        raise ApiError(404, "NOT_FOUND", "Entrega no encontrada.")

    await require_cohort_access(submission.cohort_id, user, session, staff=True)
    return submission

@router.post("/submissions/{submission_id}/review")
async def create_submission_review(
    submission_id: UUID, body: ReviewBody, user: CurrentUser, session: SessionDep
):
    submission = await session.scalar(select(Submission).where(Submission.id == submission_id))
    if not submission:
        raise ApiError(404, "NOT_FOUND", "Entrega no encontrada.")

    await require_cohort_access(submission.cohort_id, user, session, staff=True)

    review = SubmissionReview(
        submission_id=submission.id, reviewer_id=user.id, verdict=body.verdict, note=body.note
    )
    session.add(review)
    await session.commit()

    return review

@router.patch("/cohorts/{cohort_id}/active-session")
async def update_cohort_active_session(
    cohort_id: UUID, body: ActiveSessionUpdate, user: CurrentUser, session: SessionDep
):
    await require_cohort_access(cohort_id, user, session, staff=True)

    objetivo = None
    if body.active_session_id is not None:
        objetivo = await session.get(SessionCatalog, body.active_session_id)
        if objetivo is None or not objetivo.is_published:
            raise ApiError(404, "NOT_FOUND", "Esa sesion no existe o no esta publicada.")

    state = await session.scalar(select(CohortState).where(CohortState.cohort_id == cohort_id))
    if not state:
        state = CohortState(cohort_id=cohort_id)
        session.add(state)
        await session.flush()

    before = {"active_session_id": str(state.active_session_id) if state.active_session_id else None}
    state.active_session_id = body.active_session_id
    state.updated_by = user.id

    if objetivo is not None:
        pausa = await session.get(CohortSessionOverride, (cohort_id, objetivo.id))
        if pausa is not None and pausa.is_closed:
            pausa.is_closed = False
            pausa.updated_by = user.id
            await create_audit_log(
                session,
                user.id,
                "REOPEN_SESSION",
                "cohort_session",
                f"{cohort_id}:{objetivo.id}",
                {"paused": True, "session_code": objetivo.code},
                {"paused": False, "session_code": objetivo.code, "reason": "activated"},
            )

    # Cambiar el dia actual cambia lo que ve toda la clase: queda registrado igual
    # que cuando lo hace un administrador. La pausa de dias es solo de admin.
    await create_audit_log(
        session,
        user.id,
        "ADVANCE_SESSION",
        "cohort_state",
        str(cohort_id),
        before,
        {"active_session_id": str(state.active_session_id) if state.active_session_id else None},
    )

    await session.commit()
    return state
