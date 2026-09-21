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
    CohortUpdateBody,
    DashboardMetrics,
    FeatureFlagUpdate,
    RoleUpdateBody,
)
from app.auth.dependencies import CurrentUser, require_role
from app.cohorts.service import hash_join_code
from app.core.errors import ApiError
from app.db.models import (
    AdminAllowlist,
    AuditLog,
    Cohort,
    CohortMembership,
    CohortState,
    FeatureFlag,
    User,
)
from app.db.session import SessionDep

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))])

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
    after_state: dict | None = None
):
    log = AuditLog(
        actor_user_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_state=before_state,
        after_state=after_state
    )
    session.add(log)


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard(session: SessionDep):
    cohorts_count = await session.scalar(select(func.count()).select_from(Cohort))
    students_count = await session.scalar(select(func.count()).select_from(User).where(User.role == "student"))
    return DashboardMetrics(
        cohorts_count=cohorts_count or 0,
        students_count=students_count or 0
    )


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
        created_by=user.id
    )
    session.add(cohort)
    try:
        await session.flush()
    except IntegrityError:
        raise ApiError(409, "COHORT_EXISTS", "Ya existe una cohorte con este slug.")
    
    # Initialize cohort state
    cohort_state = CohortState(cohort_id=cohort.id)
    session.add(cohort_state)
    
    await create_audit_log(session, user.id, "CREATE_COHORT", "cohort", str(cohort.id), None, {"name": cohort.name})
    await session.commit()
    
    return CohortCreateResponse(
        id=cohort.id,
        name=cohort.name,
        slug=cohort.slug,
        join_code_plaintext=join_code
    )


@router.patch("/cohorts/{cohort_id}")
async def update_cohort(cohort_id: UUID, body: CohortUpdateBody, user: CurrentUser, session: SessionDep):
    cohort = await session.scalar(select(Cohort).where(Cohort.id == cohort_id))
    if not cohort:
        raise ApiError(404, "NOT_FOUND", "Cohorte no encontrada.")
    
    before = {"name": cohort.name, "slug": cohort.slug, "is_active": cohort.is_active}
    
    if body.name is not None: cohort.name = body.name
    if body.slug is not None: cohort.slug = body.slug
    if body.description is not None: cohort.description = body.description
    if body.starts_on is not None: cohort.starts_on = body.starts_on
    if body.ends_on is not None: cohort.ends_on = body.ends_on
    if body.is_active is not None: cohort.is_active = body.is_active
    
    try:
        await session.flush()
    except IntegrityError:
        raise ApiError(409, "COHORT_EXISTS", "El slug ya está en uso.")
        
    after = {"name": cohort.name, "slug": cohort.slug, "is_active": cohort.is_active}
    await create_audit_log(session, user.id, "UPDATE_COHORT", "cohort", str(cohort.id), before, after)
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


@router.get("/cohorts/{cohort_id}/students")
async def get_cohort_students(cohort_id: UUID, session: SessionDep):
    students = await session.scalars(
        select(User)
        .join(CohortMembership, User.id == CohortMembership.user_id)
        .where(CohortMembership.cohort_id == cohort_id, CohortMembership.role == "student")
    )
    return students.all()


@router.patch("/cohorts/{cohort_id}/active-session")
async def update_active_session(cohort_id: UUID, body: ActiveSessionUpdate, user: CurrentUser, session: SessionDep):
    state = await session.scalar(select(CohortState).where(CohortState.cohort_id == cohort_id))
    if not state:
        state = CohortState(cohort_id=cohort_id)
        session.add(state)
        await session.flush()
        
    before = {"active_session_id": str(state.active_session_id) if state.active_session_id else None}
    state.active_session_id = body.active_session_id
    state.updated_by = user.id
    after = {"active_session_id": str(state.active_session_id) if state.active_session_id else None}
    
    await create_audit_log(session, user.id, "ADVANCE_SESSION", "cohort_state", str(cohort_id), before, after)
    await session.commit()
    return state


@router.get("/users")
async def list_users(session: SessionDep):
    users = await session.scalars(select(User).order_by(User.created_at.desc()))
    return users.all()


@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: UUID, body: RoleUpdateBody, user: CurrentUser, session: SessionDep):
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
    admins = await session.scalars(select(AdminAllowlist).order_by(AdminAllowlist.created_at.desc()))
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
async def update_feature_flag(key: str, body: FeatureFlagUpdate, user: CurrentUser, session: SessionDep):
    # For MVP, only updating global flags
    flag = await session.scalar(select(FeatureFlag).where(FeatureFlag.key == key, FeatureFlag.cohort_id.is_(None)))
    if not flag:
        flag = FeatureFlag(key=key, updated_by=user.id)
        session.add(flag)
        
    before = {"enabled": flag.enabled, "config": flag.config}
    if body.enabled is not None: flag.enabled = body.enabled
    if body.config is not None: flag.config = body.config
    flag.updated_by = user.id
    
    after = {"enabled": flag.enabled, "config": flag.config}
    await create_audit_log(session, user.id, "CHANGE_FEATURE_FLAG", "feature_flag", key, before, after)
    await session.commit()
    return flag


@router.get("/audit")
async def list_audit_logs(session: SessionDep):
    logs = await session.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100))
    return logs.all()
