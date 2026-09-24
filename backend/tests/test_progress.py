import asyncio
from uuid import uuid4

import pytest

from app.db.models import (
    Challenge,
    Cohort,
    CohortMembership,
    CohortState,
    Progress,
    SessionCatalog,
    Submission,
)
from tests.test_auth import bearer, identity


async def setup_test_data(h):
    user_id = uuid4()
    h.identities["student"] = identity(uid="stu1", email="s@example.com", verified=True)

    # Bootstrap user
    res = await h.client.post("/api/auth/bootstrap", headers=bearer("student"))
    user_id_str = res.json()["user"]["id"]
    from uuid import UUID

    user_id = UUID(user_id_str)

    async with h.sessions.begin() as session:
        # Create cohort
        cohort = Cohort(name="C1", slug="c1", join_code_hash="test", is_active=True)
        session.add(cohort)
        await session.flush()

        session.add(CohortMembership(cohort_id=cohort.id, user_id=user_id, status="active"))

        # Create sessions
        sess1 = SessionCatalog(
            code="S1", day_number=1, order_index=1, title="S1", is_published=True
        )
        sess2 = SessionCatalog(
            code="S2", day_number=2, order_index=2, title="S2", is_published=True
        )
        session.add_all([sess1, sess2])
        await session.flush()

        # Set active session to sess1
        session.add(CohortState(cohort_id=cohort.id, active_session_id=sess1.id))

        # Create challenges
        c1 = Challenge(session_id=sess1.id, key="E1", title="Unlocked", status="published")
        c2 = Challenge(session_id=sess2.id, key="E2", title="Locked", status="published")
        session.add_all([c1, c2])
        await session.flush()

    return {"cohort_id": cohort.id, "c1": "E1", "c2": "E2", "user_id": user_id}


@pytest.mark.asyncio
async def test_progress_student_not_member(auth_harness):
    h = auth_harness
    h.identities["nomember"] = identity(uid="nom", email="no@m.com")
    await h.client.post("/api/auth/bootstrap", headers=bearer("nomember"))

    res = await h.client.get("/api/challenges/E1/progress", headers=bearer("nomember"))
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "NOT_COHORT_MEMBER"


@pytest.mark.asyncio
async def test_progress_unlocked_and_locked(auth_harness):
    h = auth_harness
    data = await setup_test_data(h)

    # Unlocked - GET
    res = await h.client.get(f"/api/challenges/{data['c1']}/progress", headers=bearer("student"))
    assert res.status_code == 200
    assert res.json()["status"] == "not_started"

    # Locked - GET
    res = await h.client.get(f"/api/challenges/{data['c2']}/progress", headers=bearer("student"))
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "CHALLENGE_LOCKED"

    # Unlocked - PUT
    res = await h.client.put(
        f"/api/challenges/{data['c1']}/progress",
        json={"draft_code": "print(1)"},
        headers=bearer("student"),
    )
    assert res.status_code == 200
    assert res.json()["draft_code"] == "print(1)"

    # Locked - PUT
    res = await h.client.put(
        f"/api/challenges/{data['c2']}/progress",
        json={"draft_code": "print(1)"},
        headers=bearer("student"),
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_progress_draft_persists_and_is_idempotent(auth_harness):
    h = auth_harness
    data = await setup_test_data(h)

    await h.client.put(
        f"/api/challenges/{data['c1']}/progress",
        json={"draft_code": "v1"},
        headers=bearer("student"),
    )
    await h.client.put(
        f"/api/challenges/{data['c1']}/progress",
        json={"draft_code": "v2"},
        headers=bearer("student"),
    )

    res3 = await h.client.get(f"/api/challenges/{data['c1']}/progress", headers=bearer("student"))
    assert res3.json()["draft_code"] == "v2"
    assert res3.json()["status"] == "draft"


@pytest.mark.asyncio
async def test_submission_unlocked_and_locked(auth_harness):
    h = auth_harness
    data = await setup_test_data(h)

    # Locked - POST submit
    res = await h.client.post(
        f"/api/challenges/{data['c2']}/submit",
        json={"code_submitted": "print(1)"},
        headers=bearer("student"),
    )
    assert res.status_code == 403

    # Unlocked - POST submit
    res = await h.client.post(
        f"/api/challenges/{data['c1']}/submit",
        json={"code_submitted": "print(1)"},
        headers=bearer("student"),
    )
    assert res.status_code == 200
    assert res.json()["attempt_number"] == 1


@pytest.mark.skip(reason="Cannot test concurrency using single shared AsyncSession fixture")
@pytest.mark.asyncio
async def test_submission_concurrency(auth_harness):
    h = auth_harness
    data = await setup_test_data(h)

    # Two simultaneous requests for the same challenge
    tasks = [
        h.client.post(
            f"/api/challenges/{data['c1']}/submit",
            json={"code_submitted": "v1"},
            headers=bearer("student"),
        ),
        h.client.post(
            f"/api/challenges/{data['c1']}/submit",
            json={"code_submitted": "v2"},
            headers=bearer("student"),
        ),
    ]
    responses = await asyncio.gather(*tasks)

    # Both must succeed
    assert responses[0].status_code == 200
    assert responses[1].status_code == 200

    # Attempt numbers must be 1 and 2
    attempts = {responses[0].json()["attempt_number"], responses[1].json()["attempt_number"]}
    assert attempts == {1, 2}

    # Verify in DB
    from sqlalchemy import select

    async with h.sessions() as session:
        subs = (await session.scalars(select(Submission).order_by(Submission.attempt_number))).all()
        assert len(subs) == 2
        assert subs[0].attempt_number == 1
        assert subs[1].attempt_number == 2

        # Verify progress attempts_count is 2
        prog = await session.scalar(select(Progress))
        assert prog.attempts_count == 2


@pytest.mark.asyncio
async def test_accepted_is_sticky_and_can_be_saved_without_draft_code(auth_harness):
    """Lo que hace el frontend (VistaEstudiante): autoguardado con in_progress, y el aceptado
    por la misma cola SIN draft_code, para no pisar un borrador más nuevo. Un autoguardado
    posterior nunca degrada el aceptado."""
    h = auth_harness
    data = await setup_test_data(h)
    url = f"/api/challenges/{data['c1']}/progress"

    r = await h.client.put(
        url, json={"draft_code": "entregado", "status": "in_progress"}, headers=bearer("student")
    )
    assert r.status_code == 200

    # accepted exige todos los casos.
    r = await h.client.put(
        url, json={"status": "accepted", "cases_passed": 2, "cases_total": 3}, headers=bearer("student")
    )
    assert r.status_code == 422

    r = await h.client.put(
        url, json={"status": "accepted", "cases_passed": 3, "cases_total": 3}, headers=bearer("student")
    )
    assert r.status_code == 200
    assert r.json()["status"] == "accepted"
    assert r.json()["draft_code"] == "entregado", "sin draft_code, el borrador no cambia"
    assert r.json()["accepted_at"] is not None

    # Seguir editando: el autoguardado manda in_progress y el reto sigue aceptado.
    r = await h.client.put(
        url, json={"draft_code": "repaso", "status": "in_progress"}, headers=bearer("student")
    )
    assert r.status_code == 200
    vista = (await h.client.get(url, headers=bearer("student"))).json()
    assert vista["status"] == "accepted"
    assert vista["draft_code"] == "repaso"
    assert vista["cases_passed"] == 3 and vista["cases_total"] == 3
