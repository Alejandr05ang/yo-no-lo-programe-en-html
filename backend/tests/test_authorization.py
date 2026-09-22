from uuid import uuid4

import pytest

from app.core.errors import ApiError
from app.db.models import Cohort, CohortMembership, User


@pytest.mark.parametrize("role,status", [("student", 403), ("instructor", 403), ("admin", 200)])
async def test_require_admin_uses_database_role(auth_harness, role, status):
    from fastapi import Depends

    from app.auth.dependencies import require_role
    from app.auth.firebase import FirebaseIdentity
    from app.db.models import AdminAllowlist

    h = auth_harness
    h.identities["valid"] = FirebaseIdentity("uid", "person@example.invalid", True, "password")
    async with h.sessions.begin() as session:
        session.add(User(firebase_uid="uid", email="person@example.invalid", role=role))
        if role == "admin":
            session.add(AdminAllowlist(email="person@example.invalid"))

    @h.app.get("/test-admin", dependencies=[Depends(require_role("admin"))])
    async def admin_probe():
        return {"allowed": True}

    response = await h.client.get("/test-admin", headers={"Authorization": "Bearer valid"})
    assert response.status_code == status


async def test_instructor_is_limited_to_active_instructor_membership(auth_harness):
    from app.auth.dependencies import require_cohort_access

    h = auth_harness
    async with h.sessions.begin() as session:
        user = User(
            firebase_uid="instructor",
            email="instructor@example.invalid",
            role="instructor",
            email_verified=True,
        )
        cohort = Cohort(name="Test", slug="test", join_code_hash="only-a-test-hash")
        session.add_all([user, cohort])
        await session.flush()
        member = CohortMembership(cohort_id=cohort.id, user_id=user.id, role="instructor")
        session.add(member)
        await session.flush()
        assert await require_cohort_access(cohort.id, user, session, staff=True) is member
        with pytest.raises(ApiError) as foreign:
            await require_cohort_access(uuid4(), user, session, staff=True)
        assert foreign.value.status_code == 403
        member.status = "removed"
        await session.flush()
        with pytest.raises(ApiError):
            await require_cohort_access(cohort.id, user, session, staff=True)


async def test_student_membership_does_not_grant_instructor_permissions(auth_harness):
    from app.auth.dependencies import require_cohort_access

    async with auth_harness.sessions.begin() as session:
        user = User(
            firebase_uid="uid", email="s@example.invalid", role="student", email_verified=True
        )
        cohort = Cohort(name="Test", slug="test", join_code_hash="only-a-test-hash")
        session.add_all([user, cohort])
        await session.flush()
        member = CohortMembership(user_id=user.id, cohort_id=cohort.id)
        session.add(member)
        await session.flush()
        assert await require_cohort_access(cohort.id, user, session) is member
        with pytest.raises(ApiError) as failure:
            await require_cohort_access(cohort.id, user, session, staff=True)
        assert failure.value.status_code == 403


async def test_admin_can_access_any_cohort_without_membership(auth_harness):
    from app.auth.dependencies import require_cohort_access

    async with auth_harness.sessions.begin() as session:
        user = User(
            firebase_uid="admin", email="a@example.invalid", role="admin", email_verified=True
        )
        session.add(user)
        await session.flush()
        assert await require_cohort_access(uuid4(), user, session, staff=True) is None


async def test_unverified_identity_cannot_use_cohort_permissions(auth_harness):
    from app.auth.dependencies import require_cohort_access

    async with auth_harness.sessions.begin() as session:
        user = User(
            firebase_uid="admin", email="a@example.invalid", role="admin", email_verified=False
        )
        session.add(user)
        await session.flush()
        with pytest.raises(ApiError) as failure:
            await require_cohort_access(uuid4(), user, session)
        assert failure.value.code == "EMAIL_NOT_VERIFIED"
