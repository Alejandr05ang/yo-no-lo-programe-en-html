from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import func, select

from app.auth.dependencies import CurrentUser
from app.catalog.service import require_challenge_access
from app.core.errors import ApiError
from app.db.models import Progress, Submission
from app.db.session import SessionDep
from app.progress.schemas import ProgressUpdateBody, ProgressView, SubmitBody, SubmitResponse

router = APIRouter(prefix="/api/challenges", tags=["progress"])

@router.get("/{challenge_key}/progress", response_model=ProgressView)
async def get_progress(challenge_key: str, user: CurrentUser, session: SessionDep):
    cohort, challenge = await require_challenge_access(session, user, challenge_key)
    
    progress = await session.scalar(
        select(Progress).where(
            Progress.user_id == user.id,
            Progress.cohort_id == cohort.id,
            Progress.challenge_id == challenge.id
        )
    )
    
    if not progress:
        return ProgressView(
            cohort_id=cohort.id,
            challenge_id=challenge.id,
            status="not_started",
            draft_code="",
            attempts_count=0,
            cases_passed=0,
            cases_total=0,
            last_saved_at=None,
            accepted_at=None
        )
        
    return ProgressView(
        cohort_id=progress.cohort_id,
        challenge_id=progress.challenge_id,
        status=progress.status,
        draft_code=progress.draft_code,
        attempts_count=progress.attempts_count,
        cases_passed=progress.cases_passed,
        cases_total=progress.cases_total,
        last_saved_at=progress.last_saved_at,
        accepted_at=progress.accepted_at
    )


@router.put("/{challenge_key}/progress", response_model=ProgressView)
async def update_progress(challenge_key: str, body: ProgressUpdateBody, user: CurrentUser, session: SessionDep):
    cohort, challenge = await require_challenge_access(session, user, challenge_key)
    
    progress = await session.scalar(
        select(Progress).where(
            Progress.user_id == user.id,
            Progress.cohort_id == cohort.id,
            Progress.challenge_id == challenge.id
        )
    )
    
    now = datetime.now(UTC)
    
    if not progress:
        progress = Progress(
            user_id=user.id,
            cohort_id=cohort.id,
            challenge_id=challenge.id,
            status=body.status or "draft",
            draft_code=body.draft_code or "",
            cases_passed=body.cases_passed or 0,
            cases_total=body.cases_total or 0,
            last_saved_at=now
        )
        session.add(progress)
    else:
        if body.status is not None:
            progress.status = body.status
        if body.draft_code is not None:
            progress.draft_code = body.draft_code
        if body.cases_passed is not None:
            progress.cases_passed = body.cases_passed
        if body.cases_total is not None:
            progress.cases_total = body.cases_total
            
        progress.last_saved_at = now
        if progress.status == "accepted" and not progress.accepted_at:
            progress.accepted_at = now
            
    await session.commit()
    await session.refresh(progress)
    
    return ProgressView(
        cohort_id=progress.cohort_id,
        challenge_id=progress.challenge_id,
        status=progress.status,
        draft_code=progress.draft_code,
        attempts_count=progress.attempts_count,
        cases_passed=progress.cases_passed,
        cases_total=progress.cases_total,
        last_saved_at=progress.last_saved_at,
        accepted_at=progress.accepted_at
    )


@router.post("/{challenge_key}/submit", response_model=SubmitResponse)
async def submit_challenge(challenge_key: str, body: SubmitBody, user: CurrentUser, session: SessionDep):
    cohort, challenge = await require_challenge_access(session, user, challenge_key)
    
    from sqlalchemy.exc import IntegrityError
    
    for _ in range(3):
        attempt_number = await session.scalar(
            select(func.coalesce(func.max(Submission.attempt_number), 0))
            .where(
                Submission.user_id == user.id,
                Submission.cohort_id == cohort.id,
                Submission.challenge_id == challenge.id
            )
        )
        attempt_number += 1
        
        submission = Submission(
            user_id=user.id,
            cohort_id=cohort.id,
            challenge_id=challenge.id,
            attempt_number=attempt_number,
            code_submitted=body.code_submitted
        )
        session.add(submission)
        
        try:
            # begin_nested enables savepoints to recover from IntegrityError inside a transaction
            async with session.begin_nested():
                await session.flush()
            break
        except IntegrityError:
            continue
    else:
        raise ApiError(409, "SUBMISSION_CONFLICT", "Error al crear la entrega. Intenta nuevamente.")
    
    progress = await session.scalar(
        select(Progress).where(
            Progress.user_id == user.id,
            Progress.cohort_id == cohort.id,
            Progress.challenge_id == challenge.id
        )
    )
    if progress:
        progress.attempts_count = attempt_number
    else:
        now = datetime.now(UTC)
        progress = Progress(
            user_id=user.id,
            cohort_id=cohort.id,
            challenge_id=challenge.id,
            status="in_progress",
            draft_code=body.code_submitted,
            attempts_count=attempt_number,
            cases_passed=0,
            cases_total=0,
            last_saved_at=now
        )
        session.add(progress)
    
    await session.commit()
    await session.refresh(submission)
    
    return SubmitResponse(
        id=submission.id,
        attempt_number=submission.attempt_number,
        created_at=submission.created_at
    )
