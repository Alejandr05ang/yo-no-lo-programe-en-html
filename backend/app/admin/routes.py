import secrets
import string
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import (
    ActiveSessionUpdate,
    AdminAllowlistBody,
    CohortCreateBody,
    CohortCreateResponse,
    CohortStudent,
    CohortUpdateBody,
    DashboardMetrics,
    FeatureFlagUpdate,
    PausedSession,
    RoleUpdateBody,
    SessionAccessUpdate,
    SessionCatalogItem,
    WorkshopState,
)
from app.auth.dependencies import CurrentUser, require_role
from app.catalog.service import workshop_access
from app.cohorts.service import hash_join_code
from app.core.errors import ApiError
from app.db.models import (
    AdminAllowlist,
    AuditLog,
    Challenge,
    Cohort,
    CohortMembership,
    CohortSessionOverride,
    CohortState,
    FeatureFlag,
    SessionCatalog,
    User,
)
from app.db.session import SessionDep

router = APIRouter(
    prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))]
)


def generate_join_code() -> str:
    charset = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(charset) for _ in range(8))


async def create_audit_log(
    session: AsyncSession,
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    before_state: dict | None = None,
    after_state: dict | None = None,
):
    log = AuditLog(
        actor_user_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_state=before_state,
        after_state=after_state,
    )
    session.add(log)


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard(session: SessionDep):
    cohorts_count = await session.scalar(select(func.count()).select_from(Cohort))
    students_count = await session.scalar(
        select(func.count()).select_from(User).where(User.role == "student")
    )
    return DashboardMetrics(cohorts_count=cohorts_count or 0, students_count=students_count or 0)


@router.get("/cohorts")
async def list_cohorts(session: SessionDep):
    cohorts = await session.scalars(select(Cohort).order_by(Cohort.created_at.desc()))
    return cohorts.all()


@router.post("/cohorts", response_model=CohortCreateResponse)
async def create_cohort(body: CohortCreateBody, user: CurrentUser, session: SessionDep):
    join_code = generate_join_code()
    cohort = Cohort(
        name=body.name,
        slug=body.slug,
        description=body.description,
        starts_on=body.starts_on,
        ends_on=body.ends_on,
        join_code_hash=hash_join_code(join_code),
        created_by=user.id,
    )
    session.add(cohort)
    try:
        await session.flush()
    except IntegrityError:
        raise ApiError(409, "COHORT_EXISTS", "Ya existe una cohorte con este slug.")

    # Initialize cohort state
    cohort_state = CohortState(cohort_id=cohort.id)
    session.add(cohort_state)

    await create_audit_log(
        session, user.id, "CREATE_COHORT", "cohort", str(cohort.id), None, {"name": cohort.name}
    )
    await session.commit()

    return CohortCreateResponse(
        id=cohort.id, name=cohort.name, slug=cohort.slug, join_code_plaintext=join_code
    )


@router.patch("/cohorts/{cohort_id}")
async def update_cohort(
    cohort_id: UUID, body: CohortUpdateBody, user: CurrentUser, session: SessionDep
):
    cohort = await session.scalar(select(Cohort).where(Cohort.id == cohort_id))
    if not cohort:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")

    before = {"name": cohort.name, "slug": cohort.slug, "is_active": cohort.is_active}

    if body.name is not None:
        cohort.name = body.name
    if body.slug is not None:
        cohort.slug = body.slug
    if body.description is not None:
        cohort.description = body.description
    if body.starts_on is not None:
        cohort.starts_on = body.starts_on
    if body.ends_on is not None:
        cohort.ends_on = body.ends_on
    if body.is_active is not None:
        cohort.is_active = body.is_active

    try:
        await session.flush()
    except IntegrityError:
        raise ApiError(409, "COHORT_EXISTS", "El slug ya está en uso.")

    after = {"name": cohort.name, "slug": cohort.slug, "is_active": cohort.is_active}
    await create_audit_log(
        session, user.id, "UPDATE_COHORT", "cohort", str(cohort.id), before, after
    )
    await session.commit()
    return cohort


@router.post("/cohorts/{cohort_id}/regenerate-code")
async def regenerate_cohort_code(cohort_id: UUID, user: CurrentUser, session: SessionDep):
    cohort = await session.scalar(select(Cohort).where(Cohort.id == cohort_id))
    if not cohort:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")

    join_code = generate_join_code()
    cohort.join_code_hash = hash_join_code(join_code)

    await create_audit_log(session, user.id, "REGENERATE_JOIN_CODE", "cohort", str(cohort.id))
    await session.commit()

    return {"join_code_plaintext": join_code}


@router.get("/cohorts/{cohort_id}/students", response_model=list[CohortStudent])
async def get_cohort_students(cohort_id: UUID, session: SessionDep):
    rows = (
        await session.execute(
            select(User, CohortMembership.joined_at)
            .join(CohortMembership, User.id == CohortMembership.user_id)
            .where(
                CohortMembership.cohort_id == cohort_id,
                CohortMembership.role == "student",
                CohortMembership.status == "active",
            )
            .order_by(CohortMembership.joined_at)
        )
    ).all()
    return [
        CohortStudent(
            id=user.id,
            display_name=user.display_name,
            full_name=user.full_name,
            email=user.email,
            joined_at=joined_at,
        )
        for user, joined_at in rows
    ]


@router.patch("/cohorts/{cohort_id}/active-session", response_model=WorkshopState)
async def update_active_session(
    cohort_id: UUID, body: ActiveSessionUpdate, user: CurrentUser, session: SessionDep
):
    """Abre una sesion para la cohorte, o la devuelve al estado inicial.

    active_session_id null es deliberado: deja a los alumnos solo con la demo.
    """
    cohort = await session.get(Cohort, cohort_id)
    if not cohort:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")

    objetivo: SessionCatalog | None = None
    if body.active_session_id is not None:
        objetivo = await session.get(SessionCatalog, body.active_session_id)
        if objetivo is None or not objetivo.is_published:
            raise ApiError(404, "NOT_FOUND", "Esa sesion no existe o no esta publicada.")

    state = await session.scalar(select(CohortState).where(CohortState.cohort_id == cohort_id))
    if not state:
        state = CohortState(cohort_id=cohort_id)
        session.add(state)
        await session.flush()

    anterior = (
        await session.get(SessionCatalog, state.active_session_id)
        if state.active_session_id
        else None
    )
    before = {
        "active_session_id": str(state.active_session_id) if state.active_session_id else None,
        "active_session_code": anterior.code if anterior else None,
    }
    state.active_session_id = body.active_session_id
    state.updated_by = user.id
    after = {
        "active_session_id": str(state.active_session_id) if state.active_session_id else None,
        "active_session_code": objetivo.code if objetivo else None,
    }

    await create_audit_log(
        session, user.id, "ADVANCE_SESSION", "cohort_state", str(cohort_id), before, after
    )

    # Un dia actual pausado no tendria sentido: el alumno veria "hoy" y no podria
    # entrar. Activarlo lo reabre, y queda registrado como una reapertura mas.
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
    await session.flush()
    resultado = await build_workshop_state(session, cohort)
    await session.commit()
    return resultado


async def build_workshop_state(session: AsyncSession, cohort: Cohort) -> WorkshopState:
    """Resuelve el estado del taller de una cohorte.

    Sin sesion activa devuelve active_order_index 0, que es exactamente lo que
    catalog.service usa para dejar todo bloqueado: el alumno solo tiene la demo.
    """
    state = await session.scalar(select(CohortState).where(CohortState.cohort_id == cohort.id))
    activa = None
    if state and state.active_session_id:
        activa = await session.get(SessionCatalog, state.active_session_id)
    students = await session.scalar(
        select(func.count())
        .select_from(CohortMembership)
        .where(
            CohortMembership.cohort_id == cohort.id,
            CohortMembership.role == "student",
            CohortMembership.status == "active",
        )
    )
    pausas = (
        await session.execute(
            select(CohortSessionOverride, SessionCatalog.code, User.display_name, User.full_name)
            .join(SessionCatalog, SessionCatalog.id == CohortSessionOverride.session_id)
            .outerjoin(User, User.id == CohortSessionOverride.updated_by)
            .where(
                CohortSessionOverride.cohort_id == cohort.id,
                CohortSessionOverride.is_closed.is_(True),
            )
            .order_by(SessionCatalog.order_index)
        )
    ).all()
    return WorkshopState(
        cohort_id=cohort.id,
        cohort_name=cohort.name,
        active_session_id=activa.id if activa else None,
        active_session_code=activa.code if activa else None,
        active_session_title=activa.title if activa else None,
        active_order_index=activa.order_index if activa else 0,
        students_count=students or 0,
        updated_at=state.updated_at if state else None,
        paused_sessions=[
            PausedSession(
                session_id=pausa.session_id,
                code=code,
                updated_at=pausa.updated_at,
                updated_by_name=(display or full or None),
            )
            for pausa, code, display, full in pausas
        ],
    )


@router.put(
    "/cohorts/{cohort_id}/sessions/{session_id}/access", response_model=WorkshopState
)
async def update_session_access(
    cohort_id: UUID,
    session_id: UUID,
    body: SessionAccessUpdate,
    user: CurrentUser,
    session: SessionDep,
):
    """Pausa o reabre un dia concreto para una cohorte.

    No toca el dia actual ni ningun progreso. Pausar solo se permite en un dia que
    el curso ya abrio; reabrir se permite siempre, tambien sobre un dia que quedo
    pausado por delante del dia actual tras retroceder el curso. Reabrir nunca
    adelanta el curso: un dia futuro sigue bloqueado por la regla acumulativa.
    """
    cohort = await session.get(Cohort, cohort_id)
    if not cohort:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")
    item = await session.get(SessionCatalog, session_id)
    if item is None or not item.is_published:
        raise ApiError(404, "NOT_FOUND", "Esa sesion no existe o no esta publicada.")

    pausa = await session.get(CohortSessionOverride, (cohort_id, session_id))
    estaba_pausado = pausa is not None and pausa.is_closed
    if body.paused == estaba_pausado:
        # Idempotente: repetir la orden no genera otra entrada de auditoria.
        return await build_workshop_state(session, cohort)

    if body.paused:
        state = await session.scalar(
            select(CohortState).where(CohortState.cohort_id == cohort_id)
        )
        acceso = await workshop_access(session, cohort_id, state)
        if item.order_index > acceso.active_order:
            raise ApiError(
                409,
                "SESSION_NOT_OPEN",
                "Solo se puede pausar un día que la clase ya tiene disponible.",
            )
        if pausa is None:
            pausa = CohortSessionOverride(cohort_id=cohort_id, session_id=session_id)
            session.add(pausa)
        pausa.is_closed = True
    else:
        pausa.is_closed = False
    pausa.updated_by = user.id

    await create_audit_log(
        session,
        user.id,
        "PAUSE_SESSION" if body.paused else "REOPEN_SESSION",
        "cohort_session",
        f"{cohort_id}:{session_id}",
        {"paused": estaba_pausado, "session_code": item.code},
        {"paused": body.paused, "session_code": item.code},
    )
    await session.flush()
    resultado = await build_workshop_state(session, cohort)
    await session.commit()
    return resultado


@router.get("/sessions", response_model=list[SessionCatalogItem])
async def list_sessions(session: SessionDep):
    """Catalogo completo de sesiones para el panel de administracion.

    Existe aparte de GET /api/map porque aquel exige membresia de cohorte y un
    administrador no tiene por que estar matriculado en la clase que gobierna.
    """
    rows = (
        await session.execute(
            select(
                SessionCatalog,
                select(func.count())
                .select_from(Challenge)
                .where(Challenge.session_id == SessionCatalog.id, Challenge.status == "published")
                .scalar_subquery()
                .label("challenges_count"),
            ).order_by(SessionCatalog.order_index)
        )
    ).all()
    return [
        SessionCatalogItem(
            id=item.id,
            code=item.code,
            day_number=item.day_number,
            order_index=item.order_index,
            title=item.title,
            teaser_summary=item.teaser_summary,
            is_published=item.is_published,
            challenges_count=count,
        )
        for item, count in rows
    ]


@router.get("/cohorts/{cohort_id}/state", response_model=WorkshopState)
async def get_workshop_state(cohort_id: UUID, session: SessionDep):
    cohort = await session.get(Cohort, cohort_id)
    if not cohort:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")
    return await build_workshop_state(session, cohort)


@router.get("/users")
async def list_users(session: SessionDep):
    users = await session.scalars(select(User).order_by(User.created_at.desc()))
    return users.all()


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: UUID, body: RoleUpdateBody, user: CurrentUser, session: SessionDep
):
    target = await session.scalar(select(User).where(User.id == user_id))
    if not target:
        raise ApiError(404, "NOT_FOUND", "Usuario no encontrado.")

    before = {"role": target.role}
    target.role = body.role
    after = {"role": target.role}

    await create_audit_log(session, user.id, "CHANGE_ROLE", "user", str(target.id), before, after)
    await session.commit()
    return target


@router.get("/admins")
async def list_admins(session: SessionDep):
    admins = await session.scalars(
        select(AdminAllowlist).order_by(AdminAllowlist.created_at.desc())
    )
    return admins.all()


@router.post("/admins")
async def add_admin(body: AdminAllowlistBody, user: CurrentUser, session: SessionDep):
    email = body.email.strip().lower()
    existing = await session.scalar(select(AdminAllowlist).where(AdminAllowlist.email == email))
    if existing:
        return existing

    admin_entry = AdminAllowlist(email=email, added_by=user.id)
    session.add(admin_entry)

    # Also promote the user immediately if they exist
    target_user = await session.scalar(select(User).where(func.lower(User.email) == email))
    if target_user and target_user.role != "admin":
        target_user.role = "admin"

    await create_audit_log(session, user.id, "ADD_ADMIN", "admin_allowlist", email)
    await session.commit()
    return admin_entry


@router.get("/feature-flags")
async def list_feature_flags(session: SessionDep):
    flags = await session.scalars(select(FeatureFlag))
    return flags.all()


@router.patch("/feature-flags/{key}")
async def update_feature_flag(
    key: str, body: FeatureFlagUpdate, user: CurrentUser, session: SessionDep
):
    # For MVP, only updating global flags
    flag = await session.scalar(
        select(FeatureFlag).where(FeatureFlag.key == key, FeatureFlag.cohort_id.is_(None))
    )
    if not flag:
        flag = FeatureFlag(key=key, updated_by=user.id)
        session.add(flag)

    before = {"enabled": flag.enabled, "config": flag.config}
    if body.enabled is not None:
        flag.enabled = body.enabled
    if body.config is not None:
        flag.config = body.config
    flag.updated_by = user.id

    after = {"enabled": flag.enabled, "config": flag.config}
    await create_audit_log(
        session, user.id, "CHANGE_FEATURE_FLAG", "feature_flag", key, before, after
    )
    await session.commit()
    return flag


@router.get("/audit")
async def list_audit_logs(session: SessionDep):
    logs = await session.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100))
    return logs.all()
