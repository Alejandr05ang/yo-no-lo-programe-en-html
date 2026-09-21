from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.firebase import FirebaseIdentity, get_firebase_identity
from app.auth.service import bootstrap_user
from app.core.errors import ApiError
from app.db.models import Cohort, CohortMembership, User
from app.db.session import SessionDep

IdentityDep = Annotated[FirebaseIdentity, Depends(get_firebase_identity)]


async def get_current_user(request: Request, identity: IdentityDep, session: SessionDep) -> User:
    user = await bootstrap_user(session, identity, create=False)
    request.state.actor_id = str(user.id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_verified(user: User) -> None:
    if not user.is_active:
        raise ApiError(403, "ACCOUNT_DISABLED", "Esta cuenta está desactivada.")
    if not user.email_verified:
        raise ApiError(403, "EMAIL_NOT_VERIFIED", "Verifica tu correo para continuar.")


def require_role(*roles: str):
    async def dependency(user: CurrentUser) -> User:
        require_verified(user)
        if user.role not in roles:
            raise ApiError(403, "FORBIDDEN", "No tienes permiso para esta acción.")
        return user

    return dependency


async def require_cohort_access(
    cohort_id: UUID, user: User, session: AsyncSession, *, staff: bool = False
) -> CohortMembership | None:
    """Call with the user supplied by get_current_user, never a user id from the client.

    Global admins bypass memberships; the caller still checks resource existence.
    Staff operations require both the DB system role and the cohort instructor role.
    """
    require_verified(user)
    if user.role == "admin":
        return None
    membership = await session.scalar(
        select(CohortMembership)
        .join(Cohort, Cohort.id == CohortMembership.cohort_id)
        .where(
            CohortMembership.cohort_id == cohort_id,
            CohortMembership.user_id == user.id,
            CohortMembership.status == "active",
            Cohort.is_active.is_(True),
        )
    )
    if membership is None or (
        staff and (user.role != "instructor" or membership.role != "instructor")
    ):
        raise ApiError(403, "NOT_COHORT_MEMBER", "No tienes acceso a esta clase.")
    return membership
