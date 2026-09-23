"""Acceso del alumno a los dias y retos del taller.

Jerarquia, de mayor a menor precedencia:

1. Dia pausado por el docente (cohort_session_overrides.is_closed): el dia y
   TODOS sus retos quedan cerrados. Ningun override de reto lo reabre.
2. Override de reto (challenge_overrides.unlocked): con el dia no pausado, decide
   un reto concreto, en cualquier sentido.
3. Regla base acumulativa: abierto todo dia con order_index <= el del dia actual
   (cohort_state.active_session_id). Sin dia actual, order 0: nada abierto.

Una pausa nunca abre nada: reabrir un dia solo quita la pausa, y un dia futuro
sigue bloqueado por la regla base.
"""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_verified
from app.catalog.schemas import (
    ChallengeDetail,
    ChallengeTeaser,
    MapView,
    SessionAccess,
    SessionDetail,
    SessionProgress,
    SessionTeaser,
)
from app.core.errors import ApiError
from app.db.models import (
    Challenge,
    ChallengeOverride,
    Cohort,
    CohortMembership,
    CohortSessionOverride,
    CohortState,
    Progress,
    SessionCatalog,
    User,
)

# Un reto platino es un extra: no impide dar el dia por completado.
REQUIRED_KINDS = frozenset({"core", "manual"})


def es_requerido(challenge: Challenge) -> bool:
    return challenge.kind in REQUIRED_KINDS and challenge.requires_submission is not False


@dataclass(frozen=True)
class WorkshopAccess:
    """Lo que una cohorte tiene abierto ahora mismo."""

    active_order: int
    active_session_id: UUID | None
    closed_session_ids: frozenset[UUID]

    def session_access(self, item: SessionCatalog) -> SessionAccess:
        # El futuro manda: un dia al que no ha llegado el curso esta bloqueado
        # aunque tenga una fila de override.
        if item.order_index > self.active_order:
            return "locked"
        if item.id in self.closed_session_ids:
            return "paused"
        return "open"

    def is_current(self, item: SessionCatalog) -> bool:
        return self.active_session_id is not None and item.id == self.active_session_id

    def challenge_unlocked(
        self, item: SessionCatalog, override: ChallengeOverride | None
    ) -> bool:
        access = self.session_access(item)
        if access == "paused":
            return False
        if override is not None and override.unlocked is not None:
            return override.unlocked
        return access == "open"


async def workshop_access(
    session: AsyncSession, cohort_id: UUID, cohort_state: CohortState | None
) -> WorkshopAccess:
    active: SessionCatalog | None = None
    if cohort_state and cohort_state.active_session_id:
        active = await session.get(SessionCatalog, cohort_state.active_session_id)
    closed = (
        await session.scalars(
            select(CohortSessionOverride.session_id).where(
                CohortSessionOverride.cohort_id == cohort_id,
                CohortSessionOverride.is_closed.is_(True),
            )
        )
    ).all()
    return WorkshopAccess(
        active_order=active.order_index if active else 0,
        active_session_id=active.id if active else None,
        closed_session_ids=frozenset(closed),
    )


def session_state(item: SessionCatalog, access: WorkshopAccess) -> str:
    """Posicion respecto al dia actual, sin tener en cuenta pausas."""
    if not access.active_order or item.order_index > access.active_order:
        return "future"
    if item.order_index == access.active_order:
        return "active"
    return "done"


def locked_error(access: SessionAccess) -> ApiError:
    if access == "paused":
        return ApiError(
            403,
            "SESSION_PAUSED",
            "Tu docente pausó temporalmente este día. Tu progreso sigue guardado.",
        )
    return ApiError(403, "SESSION_LOCKED", "Esta sesión todavía no está disponible.")


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


async def progress_by_challenge(
    session: AsyncSession, user: User, cohort: Cohort
) -> dict[UUID, str]:
    rows = (
        await session.execute(
            select(Progress.challenge_id, Progress.status).where(
                Progress.user_id == user.id, Progress.cohort_id == cohort.id
            )
        )
    ).all()
    return {challenge_id: status for challenge_id, status in rows}


def resumen(teasers: list[ChallengeTeaser]) -> SessionProgress:
    requeridos = [t for t in teasers if t.required]
    return SessionProgress(
        required_total=len(requeridos),
        accepted=sum(1 for t in requeridos if t.progress_status == "accepted"),
        started=sum(1 for t in requeridos if t.progress_status in ("draft", "in_progress")),
    )


async def visible_challenges(
    session: AsyncSession, cohort: Cohort, session_ids: list[UUID]
) -> dict[UUID, list[tuple[Challenge, ChallengeOverride | None]]]:
    """Retos publicados y visibles de esas sesiones, en su orden, con su override."""
    rows = (
        await session.execute(
            select(Challenge, ChallengeOverride)
            .outerjoin(
                ChallengeOverride,
                (ChallengeOverride.challenge_id == Challenge.id)
                & (ChallengeOverride.cohort_id == cohort.id),
            )
            .where(
                Challenge.session_id.in_(session_ids),
                Challenge.status == "published",
                Challenge.preview_visible.is_(True),
            )
            .order_by(Challenge.sort_order)
        )
    ).all()
    agrupados: dict[UUID, list[tuple[Challenge, ChallengeOverride | None]]] = {}
    for challenge, override in rows:
        if override is not None and override.preview_visible is False:
            continue
        agrupados.setdefault(challenge.session_id, []).append((challenge, override))
    return agrupados


async def map_view(session: AsyncSession, user: User) -> MapView:
    cohort, cohort_state = await user_cohort(session, user)
    access = await workshop_access(session, cohort.id, cohort_state)
    sessions = (
        await session.scalars(
            select(SessionCatalog)
            .where(SessionCatalog.is_published.is_(True))
            .order_by(SessionCatalog.order_index)
        )
    ).all()
    challenges = await visible_challenges(session, cohort, [item.id for item in sessions])
    progreso = await progress_by_challenge(session, user, cohort)

    output: list[SessionTeaser] = []
    for item in sessions:
        teasers = [
            ChallengeTeaser(
                id=challenge.id,
                key=challenge.key,
                title=challenge.title,
                teaser_summary=challenge.teaser_summary,
                kind=challenge.kind,
                unlocked=access.challenge_unlocked(item, override),
                required=es_requerido(challenge),
                progress_status=progreso.get(challenge.id, "not_started"),
            )
            for challenge, override in challenges.get(item.id, [])
        ]
        output.append(
            SessionTeaser(
                id=item.id,
                code=item.code,
                day_number=item.day_number,
                order_index=item.order_index,
                title=item.title,
                teaser_summary=item.teaser_summary,
                state=session_state(item, access),
                access=access.session_access(item),
                is_current=access.is_current(item),
                progress=resumen(teasers),
                challenges=teasers,
            )
        )
    return MapView(cohort_id=cohort.id, cohort_name=cohort.name, sessions=output)


async def require_challenge_access(
    session: AsyncSession, user: User, challenge_key: str
) -> tuple[Cohort, Challenge]:
    cohort, cohort_state = await user_cohort(session, user)

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
                SessionCatalog.is_published.is_(True),
            )
        )
    ).first()

    if not row:
        raise ApiError(404, "NOT_FOUND", "Reto no encontrado.")

    challenge, session_cat, override = row
    access = await workshop_access(session, cohort.id, cohort_state)

    # La pausa del dia va primero y tiene su propio codigo: al alumno se le dice
    # que el docente lo cerro, no que el reto no existe o que no le toca.
    if access.session_access(session_cat) == "paused":
        raise locked_error("paused")
    if not access.challenge_unlocked(session_cat, override):
        raise ApiError(403, "CHALLENGE_LOCKED", "Este reto todavía no está disponible.")

    return cohort, challenge


async def session_detail(session: AsyncSession, user: User, code: str) -> SessionDetail:
    """Una sesion del taller, identificada por su codigo publico (L1, Ma1...).

    Se busca por codigo y no por UUID porque es lo que el alumno ve y lo que va en
    la direccion. El admin la abre siempre, para poder revisar el material antes de
    abrirlo a la clase; el alumno solo si su cohorte la tiene abierta.
    """
    item = await session.scalar(
        select(SessionCatalog).where(
            SessionCatalog.code == code, SessionCatalog.is_published.is_(True)
        )
    )
    if item is None:
        raise ApiError(404, "NOT_FOUND", "Sesión no encontrada.")

    if user.role == "admin":
        require_verified(user)
        vistas = (
            await session.scalars(
                select(Challenge)
                .where(Challenge.session_id == item.id, Challenge.status == "published")
                .order_by(Challenge.sort_order)
            )
        ).all()
        return SessionDetail(
            id=item.id,
            code=item.code,
            day_number=item.day_number,
            order_index=item.order_index,
            title=item.title,
            description=item.description,
            teaser_summary=item.teaser_summary,
            challenges=[
                ChallengeDetail(
                    id=c.id,
                    key=c.key,
                    title=c.title,
                    teaser_summary=c.teaser_summary,
                    kind=c.kind,
                    unlocked=True,
                    required=es_requerido(c),
                    instructions=c.instructions,
                )
                for c in vistas
            ],
            preview=True,
        )

    cohort, state = await user_cohort(session, user)
    access = await workshop_access(session, cohort.id, state)
    acceso = access.session_access(item)
    if acceso != "open":
        raise locked_error(acceso)

    progreso = await progress_by_challenge(session, user, cohort)
    details = [
        ChallengeDetail(
            id=challenge.id,
            key=challenge.key,
            title=challenge.title,
            teaser_summary=challenge.teaser_summary,
            kind=challenge.kind,
            unlocked=access.challenge_unlocked(item, override),
            required=es_requerido(challenge),
            progress_status=progreso.get(challenge.id, "not_started"),
            instructions=challenge.instructions,
        )
        for challenge, override in (await visible_challenges(session, cohort, [item.id])).get(
            item.id, []
        )
    ]
    return SessionDetail(
        id=item.id,
        code=item.code,
        day_number=item.day_number,
        order_index=item.order_index,
        title=item.title,
        description=item.description,
        teaser_summary=item.teaser_summary,
        access=acceso,
        is_current=access.is_current(item),
        progress=resumen(details),
        challenges=details,
    )
