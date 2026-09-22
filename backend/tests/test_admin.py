import pytest
from sqlalchemy import select

from app.db.models import AdminAllowlist, AuditLog, Cohort, SessionCatalog, User
from tests.test_auth import bearer, identity


async def setup_admin_data(h):
    h.identities["admin1"] = identity(uid="a1", email="admin@example.com", verified=True)
    h.identities["student1"] = identity(uid="s1", email="stu@example.com", verified=True)
    h.identities["instructor1"] = identity(uid="i1", email="inst@example.com", verified=True)

    async with h.sessions.begin() as session:
        session.add(AdminAllowlist(email="admin@example.com", active=True))

    await h.client.post("/api/auth/bootstrap", headers=bearer("admin1"))
    await h.client.post("/api/auth/bootstrap", headers=bearer("student1"))

    async with h.sessions.begin() as session:
        user = await session.scalar(select(User).where(User.email == "inst@example.com"))
        if not user:
            # Need bootstrap for instructor
            pass

    await h.client.post("/api/auth/bootstrap", headers=bearer("instructor1"))
    async with h.sessions.begin() as session:
        u = await session.scalar(select(User).where(User.email == "inst@example.com"))
        u.role = "instructor"


@pytest.mark.asyncio
async def test_admin_roles_and_access(auth_harness):
    h = auth_harness
    await setup_admin_data(h)

    res = await h.client.get("/api/admin/cohorts", headers=bearer("student1"))
    assert res.status_code == 403

    res = await h.client.get("/api/admin/cohorts", headers=bearer("instructor1"))
    assert res.status_code == 403

    res = await h.client.get("/api/admin/cohorts", headers=bearer("admin1"))
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_admin_create_cohort_and_audit(auth_harness):
    h = auth_harness
    await setup_admin_data(h)

    res = await h.client.post(
        "/api/admin/cohorts", json={"name": "Test", "slug": "test-c"}, headers=bearer("admin1")
    )
    assert res.status_code == 200
    cohort_id = res.json()["id"]

    from uuid import UUID

    async with h.sessions() as session:
        c = await session.get(Cohort, UUID(cohort_id))
        assert c is not None
        assert c.name == "Test"

        # Verify audit log
        audit = await session.scalar(select(AuditLog).where(AuditLog.action == "CREATE_COHORT"))
        assert audit is not None
        assert audit.entity_id == str(cohort_id)


@pytest.mark.asyncio
async def test_admin_change_active_session(auth_harness):
    h = auth_harness
    await setup_admin_data(h)

    # Create cohort
    res = await h.client.post(
        "/api/admin/cohorts", json={"name": "Test2", "slug": "test-2"}, headers=bearer("admin1")
    )
    cohort_id = res.json()["id"]

    # Sin sesion activa el taller esta en su estado inicial: solo la demo.
    res = await h.client.get(f"/api/admin/cohorts/{cohort_id}/state", headers=bearer("admin1"))
    assert res.status_code == 200
    assert res.json()["active_session_id"] is None
    assert res.json()["active_order_index"] == 0

    async with h.sessions.begin() as session:
        session.add(
            SessionCatalog(
                code="L1", day_number=1, order_index=1, title="Dia 1", is_published=True
            )
        )
    async with h.sessions.begin() as session:
        dia1 = await session.scalar(select(SessionCatalog).where(SessionCatalog.code == "L1"))
        dia1_id = str(dia1.id)

    res = await h.client.patch(
        f"/api/admin/cohorts/{cohort_id}/active-session",
        json={"active_session_id": dia1_id},
        headers=bearer("admin1"),
    )
    assert res.status_code == 200
    assert res.json()["active_session_id"] == dia1_id
    assert res.json()["active_session_code"] == "L1"
    assert res.json()["active_order_index"] == 1

    # Una sesion inventada ya no se acepta: antes se guardaba un id inexistente.
    from uuid import uuid4

    res = await h.client.patch(
        f"/api/admin/cohorts/{cohort_id}/active-session",
        json={"active_session_id": str(uuid4())},
        headers=bearer("admin1"),
    )
    assert res.status_code == 404

    # Volver al estado inicial es valido y deja a los alumnos solo con la demo.
    res = await h.client.patch(
        f"/api/admin/cohorts/{cohort_id}/active-session",
        json={"active_session_id": None},
        headers=bearer("admin1"),
    )
    assert res.status_code == 200
    assert res.json()["active_session_id"] is None
    assert res.json()["active_order_index"] == 0


@pytest.mark.asyncio
async def test_admin_add_admin(auth_harness):
    h = auth_harness
    await setup_admin_data(h)

    res = await h.client.post(
        "/api/admin/admins", json={"email": "newadmin@example.com"}, headers=bearer("admin1")
    )
    assert res.status_code == 200

    async with h.sessions() as session:
        a = await session.scalar(
            select(AdminAllowlist).where(AdminAllowlist.email == "newadmin@example.com")
        )
        assert a is not None
        assert a.active is True


@pytest.mark.asyncio
async def test_admin_lists_session_catalog_in_order(auth_harness):
    h = auth_harness
    await setup_admin_data(h)

    async with h.sessions.begin() as session:
        session.add(
            SessionCatalog(code="Ma1", day_number=2, order_index=2, title="Dia 2", is_published=True)
        )
        session.add(
            SessionCatalog(code="L1", day_number=1, order_index=1, title="Dia 1", is_published=True)
        )

    res = await h.client.get("/api/admin/sessions", headers=bearer("admin1"))
    assert res.status_code == 200
    codigos = [s["code"] for s in res.json()]
    assert codigos == ["L1", "Ma1"]
    assert all("challenges_count" in s for s in res.json())


@pytest.mark.asyncio
async def test_session_catalog_is_admin_only(auth_harness):
    h = auth_harness
    await setup_admin_data(h)

    assert (await h.client.get("/api/admin/sessions", headers=bearer("student1"))).status_code == 403
    assert (await h.client.get("/api/admin/sessions")).status_code == 401
