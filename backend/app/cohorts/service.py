import hashlib
import time
from collections import OrderedDict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_verified
from app.core.errors import ApiError
from app.db.models import Cohort, CohortMembership, User


def hash_join_code(code: str) -> str:
    normalized = code.strip().upper()
    return "sha256:" + hashlib.sha256(f"tutorias:v1:{normalized}".encode()).hexdigest()


class JoinAttemptLimiter:
    def __init__(self, limit: int = 5):
        self.limit = limit
        self.windows: OrderedDict[UUID, tuple[float, int]] = OrderedDict()

    def check(self, user_id: UUID) -> None:
        now = time.monotonic()
        expired = [key for key, (until, _) in self.windows.items() if until <= now]
        for key in expired:
            self.windows.pop(key, None)
        until, count = self.windows.get(user_id, (now + 60, 0))
        if count >= self.limit:
            raise ApiError(429, "RATE_LIMITED", "Espera un minuto antes de probar otro código.")
        self.windows[user_id] = (until, count + 1)


async def join_cohort(
    session: AsyncSession, user: User, code: str
) -> tuple[Cohort, CohortMembership, bool]:
    require_verified(user)
    if user.profile_completed_at is None:
        raise ApiError(403, "PROFILE_INCOMPLETE", "Completa tu perfil antes de continuar.")
    cohort = await session.scalar(
        select(Cohort).where(
            Cohort.join_code_hash == hash_join_code(code), Cohort.is_active.is_(True)
        )
    )
    if cohort is None:
        raise ApiError(404, "INVALID_JOIN_CODE", "No pudimos validar ese código de clase.")
    membership = await session.scalar(
        select(CohortMembership).where(
            CohortMembership.cohort_id == cohort.id, CohortMembership.user_id == user.id
        )
    )
    if membership is not None:
        if membership.status != "active":
            membership.status = "active"
        await session.flush()
        return cohort, membership, False
    try:
        async with session.begin_nested():
            membership = CohortMembership(cohort_id=cohort.id, user_id=user.id)
            session.add(membership)
            await session.flush()
    except IntegrityError:
        membership = await session.scalar(
            select(CohortMembership).where(
                CohortMembership.cohort_id == cohort.id, CohortMembership.user_id == user.id
            )
        )
        if membership is None:
            raise ApiError(
                409, "JOIN_CONFLICT", "No se pudo completar la unión a la clase."
            ) from None
    return cohort, membership, True
