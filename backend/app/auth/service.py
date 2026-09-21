from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.firebase import FirebaseIdentity
from app.auth.schemas import MeView, OnboardingView, UserView
from app.core.errors import ApiError
from app.db.models import AdminAllowlist, Cohort, CohortMembership, User


def identity_conflict() -> ApiError:
    return ApiError(
        409, "IDENTITY_CONFLICT", "No se pudo vincular esta identidad. Contacta al equipo."
    )


async def bootstrap_user(
    session: AsyncSession, identity: FirebaseIdentity, *, create: bool = True
) -> User:
    """UID is the identity key. Savepoints isolate duplicate first-login races.

    Existing admin roles are never removed here. An admin must prove the current
    verified email is allowlisted on every request; otherwise all access is denied.
    This is identity revalidation, not an admin revocation API.
    """
    email = identity.email.strip().lower()
    lookup = select(User).where(User.firebase_uid == identity.uid).with_for_update()
    user = await session.scalar(lookup)
    if user is None:
        if not create:
            raise ApiError(409, "BOOTSTRAP_REQUIRED", "Completa el inicio de sesión.")
        try:
            async with session.begin_nested():
                user = User(firebase_uid=identity.uid, email=email)
                session.add(user)
                await session.flush()
        except IntegrityError:
            user = await session.scalar(lookup)
            if user is None:
                raise identity_conflict() from None
    if not user.is_active:
        raise ApiError(403, "ACCOUNT_DISABLED", "Esta cuenta está desactivada.")
    allowlisted = False
    if identity.email_verified:
        allowlisted = bool(
            await session.scalar(
                select(AdminAllowlist.email).where(
                    func.lower(AdminAllowlist.email) == email, AdminAllowlist.active.is_(True)
                )
            )
        )
    if user.role == "admin" and not allowlisted:
        raise ApiError(
            403,
            "ADMIN_IDENTITY_REVALIDATION_REQUIRED",
            "Verifica el correo autorizado de administración para continuar.",
        )
    if user.email.lower() != email:
        other = await session.scalar(
            select(User.id).where(func.lower(User.email) == email, User.id != user.id)
        )
        if other is not None:
            raise identity_conflict()
    try:
        async with session.begin_nested():
            user.email = email
            user.email_verified = identity.email_verified
            if allowlisted:
                user.role = "admin"
            await session.flush()
    except IntegrityError:
        raise identity_conflict() from None
    return user


async def onboarding_state(session: AsyncSession, user: User) -> OnboardingView:
    if not user.email_verified:
        return OnboardingView(state="EMAIL_VERIFICATION_REQUIRED")
    if user.profile_completed_at is None:
        return OnboardingView(state="PROFILE_REQUIRED")
    if user.role in {"admin", "instructor"}:
        return OnboardingView(state="READY")
    membership = await session.scalar(
        select(CohortMembership.cohort_id)
        .join(Cohort, Cohort.id == CohortMembership.cohort_id)
        .where(
            CohortMembership.user_id == user.id,
            CohortMembership.status == "active",
            Cohort.is_active.is_(True),
        )
        .limit(1)
    )
    return OnboardingView(state="READY" if membership else "JOIN_CLASS_REQUIRED")


async def me_view(session: AsyncSession, user: User) -> MeView:
    return MeView(
        user=UserView.model_validate(user), onboarding=await onboarding_state(session, user)
    )
