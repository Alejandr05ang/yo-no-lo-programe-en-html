from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_verified
from app.catalog.schemas import (
    ChallengeDetail,
    ChallengeTeaser,
    MapView,
    SessionDetail,
    SessionTeaser,
)
from app.core.errors import ApiError
from app.db.models import (
    Challenge,
    ChallengeOverride,
    Cohort,
    CohortMembership,
    CohortState,
    SessionCatalog,
    User,
)


async def user_cohort(session: AsyncSession, user: User) -> tuple[Cohort, CohortState | None]:
    require_verified(user)
    row = (
        await session.execute(
            select(Cohort, CohortState)
            .join(CohortMembership, CohortMembership.cohort_id == Cohort.id)
            .outerjoin(CohortState, CohortState.cohort_id == Cohort.id)
            .where(
                CohortMembership.user_id == user.id,
                CohortMembership.status == "active",
                Cohort.is_active.is_(True),
            )
            .order_by(CohortMembership.joined_at.desc())
            .limit(1)
        )
    ).first()
    if row is None:
        raise ApiError(403, "NOT_COHORT_MEMBER", "Primero debes unirte a una clase.")
    return row[0], row[1]


async def map_view(session: AsyncSession, user: User) -> MapView:
    cohort, cohort_state = await user_cohort(session, user)
    sessions = (
        await session.scalars(
            select(SessionCatalog)
            .where(SessionCatalog.is_published.is_(True))
            .order_by(SessionCatalog.order_index)
        )
    ).all()
    active_order = 0
    if cohort_state and cohort_state.active_session_id:
        active = await session.get(SessionCatalog, cohort_state.active_session_id)
        active_order = active.order_index if active else 0
    output: list[SessionTeaser] = []
    for item in sessions:
        challenges = (
            await session.execute(
                select(Challenge, ChallengeOverride)
                .outerjoin(
                    ChallengeOverride,
                    (ChallengeOverride.challenge_id == Challenge.id)
                    & (ChallengeOverride.cohort_id == cohort.id),
                )
                .where(
                    Challenge.session_id == item.id,
                    Challenge.status == "published",
                    Challenge.preview_visible.is_(True),
                )
                .order_by(Challenge.sort_order)
            )
        ).all()
        teaser_rows = []
        for challenge, override in challenges:
            if override and override.preview_visible is False:
                continue
            unlocked = item.order_index <= active_order
            if override and override.unlocked is not None:
                unlocked = override.unlocked
            teaser_rows.append(
                ChallengeTeaser(
                    id=challenge.id,
                    key=challenge.key,
                    title=challenge.title,
                    teaser_summary=challenge.teaser_summary,
                    kind=challenge.kind,
                    unlocked=unlocked,
                )
            )
        state = "future"
        if active_order and item.order_index < active_order:
            state = "done"
        elif active_order and item.order_index == active_order:
            state = "active"
        output.append(
            SessionTeaser(
                id=item.id,
                code=item.code,
                day_number=item.day_number,
                order_index=item.order_index,
                title=item.title,
                teaser_summary=item.teaser_summary,
                state=state,
                challenges=teaser_rows,
            )
        )
    return MapView(cohort_id=cohort.id, cohort_name=cohort.name, sessions=output)


async def require_challenge_access(
    session: AsyncSession, user: User, challenge_key: str
) -> tuple[Cohort, Challenge]:
    cohort, cohort_state = await user_cohort(session, user)
    
    # Fetch the challenge and its override
    row = (
        await session.execute(
            select(Challenge, SessionCatalog, ChallengeOverride)
            .join(SessionCatalog, SessionCatalog.id == Challenge.session_id)
            .outerjoin(
                ChallengeOverride,
                (ChallengeOverride.challenge_id == Challenge.id)
                & (ChallengeOverride.cohort_id == cohort.id),
            )
            .where(
                Challenge.key == challenge_key,
                Challenge.status == "published",
                SessionCatalog.is_published.is_(True)
            )
        )
    ).first()
    
    if not row:
        raise ApiError(404, "NOT_FOUND", "Reto no encontrado.")
        
    challenge, session_cat, override = row
    
    unlocked = False
    if cohort_state and cohort_state.active_session_id:
        active = await session.get(SessionCatalog, cohort_state.active_session_id)
        if active and session_cat.order_index <= active.order_index:
            unlocked = True
            
    if override and override.unlocked is not None:
        unlocked = override.unlocked
        
    if not unlocked:
        raise ApiError(403, "CHALLENGE_LOCKED", "Este reto todavía no está disponible.")
        
    return cohort, challenge


async def session_detail(
    session: AsyncSession, user: User, session_id: UUID
) -> SessionDetail:
    cohort, state = await user_cohort(session, user)
    item = await session.get(SessionCatalog, session_id)
    active = (
        await session.get(SessionCatalog, state.active_session_id)
        if state and state.active_session_id
        else None
    )
    if item is None or not item.is_published:
        raise ApiError(404, "NOT_FOUND", "Sesión no encontrada.")
    if active is None or item.order_index > active.order_index:
        raise ApiError(403, "SESSION_LOCKED", "Esta sesión todavía no está disponible.")
    rows = (
        await session.execute(
            select(Challenge, ChallengeOverride)
            .outerjoin(
                ChallengeOverride,
                (ChallengeOverride.challenge_id == Challenge.id)
                & (ChallengeOverride.cohort_id == cohort.id),
            )
            .where(Challenge.session_id == item.id, Challenge.status == "published")
            .order_by(Challenge.sort_order)
        )
    ).all()
    details = []
    for challenge, override in rows:
        if override and override.unlocked is False:
            continue
        details.append(
            ChallengeDetail(
                id=challenge.id,
                key=challenge.key,
                title=challenge.title,
                teaser_summary=challenge.teaser_summary,
                kind=challenge.kind,
                unlocked=True,
                instructions=challenge.instructions,
            )
        )
    return SessionDetail(
        id=item.id,
        code=item.code,
        title=item.title,
        description=item.description,
        challenges=details,
    )
