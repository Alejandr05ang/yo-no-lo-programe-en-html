import pytest
from sqlalchemy import select

from app.db.models import Cohort, CohortMembership, User
from tests.test_auth import bearer, identity


async def setup_instructor_data(h):
    h.identities["inst1"] = identity(uid="i1", email="i1@example.com", verified=True)
    h.identities["inst2"] = identity(uid="i2", email="i2@example.com", verified=True)
    h.identities["stu1"] = identity(uid="s1", email="s1@example.com", verified=True)

    await h.client.post("/api/auth/bootstrap", headers=bearer("inst1"))
    await h.client.post("/api/auth/bootstrap", headers=bearer("inst2"))
    await h.client.post("/api/auth/bootstrap", headers=bearer("stu1"))

    async with h.sessions.begin() as session:
        users = (await session.scalars(select(User))).all()
        u1, u2, s1 = None, None, None
        for u in users:
            if u.email == "i1@example.com":
                u1 = u
            if u.email == "i2@example.com":
                u2 = u
            if u.email == "s1@example.com":
                s1 = u

        u1.role = "instructor"
        u2.role = "instructor"
        s1.role = "student"

        c1 = Cohort(name="C1", slug="c1", join_code_hash="test1", is_active=True)
        c2 = Cohort(name="C2", slug="c2", join_code_hash="test2", is_active=True)
        session.add_all([c1, c2])
        await session.flush()

        session.add(
            CohortMembership(cohort_id=c1.id, user_id=u1.id, role="instructor", status="active")
        )
        session.add(
            CohortMembership(cohort_id=c2.id, user_id=u2.id, role="instructor", status="active")
        )

    return c1.id, c2.id


@pytest.mark.asyncio
async def test_instructor_access_roles(auth_harness):
    h = auth_harness
    await setup_instructor_data(h)

    # Student tries to access instructor route
    res = await h.client.get("/api/instructor/cohorts", headers=bearer("stu1"))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_instructor_isolation(auth_harness):
    h = auth_harness
    c1_id, c2_id = await setup_instructor_data(h)

    # Instructor 1 sees only C1
    res1 = await h.client.get("/api/instructor/cohorts", headers=bearer("inst1"))
    assert res1.status_code == 200
    assert len(res1.json()) == 1
    assert res1.json()[0]["id"] == str(c1_id)

    # Instructor 2 sees only C2
    res2 = await h.client.get("/api/instructor/cohorts", headers=bearer("inst2"))
    assert res2.status_code == 200
    assert len(res2.json()) == 1
    assert res2.json()[0]["id"] == str(c2_id)

    # Instructor 1 tries to access C2 directly
    res3 = await h.client.get(f"/api/instructor/cohorts/{c2_id}/students", headers=bearer("inst1"))
    assert res3.status_code == 403
    assert res3.json()["error"]["code"] == "NOT_COHORT_MEMBER"
