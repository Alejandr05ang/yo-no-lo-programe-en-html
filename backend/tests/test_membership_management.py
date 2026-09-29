from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.cohorts.service import hash_join_code
from app.db.models import (
    AdminAllowlist,
    AuditLog,
    Challenge,
    Cohort,
    CohortMembership,
    CohortState,
    Progress,
    SessionCatalog,
    User,
)
from tests.test_auth import bearer, identity


async def prepare_memberships(h):
    joined = datetime(2026, 7, 1, tzinfo=UTC)
    async with h.sessions.begin() as session:
        people = {}
        for token, role in (
            ("teacher", "instructor"),
            ("foreign_teacher", "instructor"),
            ("student", "student"),
            ("foreign_student", "student"),
            ("admin", "admin"),
        ):
            email = f"{token}@example.invalid"
            h.identities[token] = identity(uid=token, email=email)
            people[token] = User(
                firebase_uid=token, email=email, role=role, email_verified=True,
                full_name=token, display_name=token, profile_completed_at=joined,
            )
            session.add(people[token])
        session.add(AdminAllowlist(email="admin@example.invalid"))
        first = Cohort(name="First", slug="first", join_code_hash=hash_join_code("FIRST-CODE"))
        second = Cohort(name="Second", slug="second", join_code_hash=hash_join_code("SECOND-CODE"))
        day = SessionCatalog(code="L1", day_number=1, order_index=1, title="Day", is_published=True)
        session.add_all([first, second, day])
        await session.flush()
        challenge = Challenge(session_id=day.id, key="e1", title="Exercise", status="published")
        session.add(challenge)
        await session.flush()
        for cohort, token, role in (
            (first, "teacher", "instructor"),
            (second, "foreign_teacher", "instructor"),
            (first, "student", "student"),
            (second, "foreign_student", "student"),
        ):
            session.add(CohortMembership(
                cohort_id=cohort.id, user_id=people[token].id, role=role,
                status="active", joined_at=joined, updated_at=joined,
            ))
        session.add(CohortState(cohort_id=first.id, active_session_id=day.id))
        session.add(Progress(
            user_id=people["student"].id, cohort_id=first.id, challenge_id=challenge.id,
            status="accepted", draft_code="saved work", attempts_count=3,
            accepted_at=joined, last_saved_at=joined, updated_at=joined,
        ))
        return {
            "first": first.id, "second": second.id, "challenge": challenge.id,
            **{token: person.id for token, person in people.items()},
        }


def membership_url(data, cohort="first", target="student"):
    return f"/api/instructor/cohorts/{data[cohort]}/students/{data[target]}/membership"


async def snapshot(h):
    async with h.sessions() as session:
        memberships = (await session.scalars(select(CohortMembership))).all()
        progress = (await session.scalars(select(Progress))).all()
        audits = (await session.scalars(select(AuditLog))).all()
        return (
            sorted((str(m.cohort_id), str(m.user_id), m.role, m.status, m.joined_at, m.updated_at)
                   for m in memberships),
            [(p.status, p.draft_code, p.attempts_count, p.accepted_at, p.last_saved_at, p.updated_at)
             for p in progress],
            [(a.action, a.entity_id, a.actor_user_id, a.before_state, a.after_state) for a in audits],
        )


@pytest.mark.parametrize("reactivator", ["teacher", "admin"])
async def test_staff_removal_blocks_join_until_explicit_reactivation(auth_harness, reactivator):
    h = auth_harness
    data = await prepare_memberships(h)
    original = await snapshot(h)
    url = membership_url(data)
    removed = await h.client.patch(url, json={"status": "removed"}, headers=bearer("teacher"))
    assert removed.status_code == 200, removed.text
    assert removed.json()["status"] == "removed"
    async with h.sessions() as session:
        member = await session.get(CohortMembership, (data["first"], data["student"]))
        assert member.status == "removed"
    denied = await h.client.post(
        "/api/cohorts/join", json={"code": "FIRST-CODE"}, headers=bearer("student"),
    )
    assert denied.status_code == 403
    assert (await h.client.get("/api/map", headers=bearer("student"))).status_code == 403
    assert (await h.client.get("/api/challenges/e1/progress", headers=bearer("student"))).status_code == 403
    me = await h.client.get("/api/me", headers=bearer("student"))
    assert me.json()["onboarding"]["state"] == "JOIN_CLASS_REQUIRED"
    assert (await snapshot(h))[1] == original[1]
    restored = await h.client.patch(url, json={"status": "active"}, headers=bearer(reactivator))
    assert restored.status_code == 200, restored.text
    assert restored.json()["status"] == "active"
    me = await h.client.get("/api/me", headers=bearer("student"))
    assert me.json()["onboarding"]["state"] == "READY"
    admitted = await h.client.get("/api/map", headers=bearer("student"))
    assert admitted.status_code == 200
    assert admitted.json()["cohort_id"] == str(data["first"])
    saved = await h.client.get("/api/challenges/e1/progress", headers=bearer("student"))
    assert saved.status_code == 200
    assert saved.json()["draft_code"] == "saved work"
    joined = await h.client.post(
        "/api/cohorts/join", json={"code": "FIRST-CODE"}, headers=bearer("student"),
    )
    assert joined.status_code == 200
    assert joined.json()["joined"] is False
    final = await snapshot(h)
    assert [m[:5] for m in final[0]] == [m[:5] for m in original[0]]
    assert final[1] == original[1]
    assert final[2] == [
        ("REMOVE_STUDENT", f"{data['first']}:{data['student']}", data["teacher"],
         {"status": "active"}, {"status": "removed"}),
        ("REACTIVATE_STUDENT", f"{data['first']}:{data['student']}", data[reactivator],
         {"status": "removed"}, {"status": "active"}),
    ]


@pytest.mark.parametrize("status", ["active", "removed", "pending"])
async def test_roster_exposes_membership_status_without_private_user_fields(auth_harness, status):
    h = auth_harness
    data = await prepare_memberships(h)
    async with h.sessions.begin() as session:
        (await session.get(CohortMembership, (data["first"], data["student"]))).status = status
    for actor in ("teacher", "admin"):
        result = await h.client.get(
            f"/api/instructor/cohorts/{data['first']}/students", headers=bearer(actor),
        )
        assert result.status_code == 200
        assert len(result.json()) == 1
        row = result.json()[0]
        assert set(row) == {"id", "email", "full_name", "display_name", "joined_at", "status"}
        assert row["id"] == str(data["student"])
        assert row["status"] == status


@pytest.mark.parametrize("desired", ["active", "removed"])
@pytest.mark.parametrize("actor", ["student", "foreign_teacher"])
async def test_unauthorized_actor_cannot_change_membership(auth_harness, actor, desired):
    h = auth_harness
    data = await prepare_memberships(h)
    before = await snapshot(h)
    response = await h.client.patch(membership_url(data), json={"status": desired}, headers=bearer(actor))
    assert response.status_code == 403
    assert await snapshot(h) == before


@pytest.mark.parametrize("revocation", ["removed", "pending", "student_membership", "disabled", "unverified"])
async def test_revoked_staff_cannot_reactivate_students(auth_harness, revocation):
    h = auth_harness
    data = await prepare_memberships(h)
    async with h.sessions.begin() as session:
        member = await session.get(CohortMembership, (data["first"], data["teacher"]))
        (await session.get(CohortMembership, (data["first"], data["student"]))).status = "removed"
        if revocation in {"removed", "pending"}:
            member.status = revocation
        elif revocation == "student_membership":
            member.role = "student"
        elif revocation == "disabled":
            (await session.get(User, data["teacher"])).is_active = False
        else:
            h.identities["teacher"] = identity(uid="teacher", email="teacher@example.invalid", verified=False)
    before = await snapshot(h)
    response = await h.client.patch(membership_url(data), json={"status": "active"}, headers=bearer("teacher"))
    assert response.status_code == 403
    assert await snapshot(h) == before


@pytest.mark.parametrize("desired", ["active", "removed"])
@pytest.mark.parametrize("target", ["teacher", "foreign_student", "missing", "global_staff"])
async def test_nonstudent_or_foreign_target_is_never_created_or_modified(auth_harness, target, desired):
    h = auth_harness
    data = await prepare_memberships(h)
    if target == "missing":
        data[target] = uuid4()
    elif target == "global_staff":
        data[target] = data["student"]
        async with h.sessions.begin() as session:
            (await session.get(User, data["student"])).role = "instructor"
    before = await snapshot(h)
    response = await h.client.patch(
        membership_url(data, target=target), json={"status": desired}, headers=bearer("teacher"),
    )
    assert response.status_code == 404
    assert await snapshot(h) == before


async def test_management_changes_only_the_selected_cohort(auth_harness):
    h = auth_harness
    data = await prepare_memberships(h)
    async with h.sessions.begin() as session:
        session.add(CohortMembership(cohort_id=data["second"], user_id=data["student"], status="removed"))
    for desired in ("removed", "active"):
        response = await h.client.patch(membership_url(data), json={"status": desired}, headers=bearer("teacher"))
        assert response.status_code == 200
        async with h.sessions() as session:
            assert (await session.get(CohortMembership, (data["first"], data["student"]))).status == desired
            assert (await session.get(CohortMembership, (data["second"], data["student"]))).status == "removed"
    before = await snapshot(h)
    foreign = await h.client.patch(
        membership_url(data, cohort="second"), json={"status": "active"}, headers=bearer("teacher"),
    )
    assert foreign.status_code == 403
    assert await snapshot(h) == before


@pytest.mark.parametrize("desired", ["active", "removed"])
async def test_pending_membership_requires_a_separate_approval_workflow(auth_harness, desired):
    h = auth_harness
    data = await prepare_memberships(h)
    async with h.sessions.begin() as session:
        (await session.get(CohortMembership, (data["first"], data["student"]))).status = "pending"
    before = await snapshot(h)
    response = await h.client.patch(membership_url(data), json={"status": desired}, headers=bearer("admin"))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "MEMBERSHIP_PENDING"
    assert await snapshot(h) == before


async def test_repeated_status_requests_do_not_change_timestamps_or_duplicate_audits(auth_harness):
    h = auth_harness
    data = await prepare_memberships(h)
    for desired in ("active", "removed", "active"):
        first = await h.client.patch(membership_url(data), json={"status": desired}, headers=bearer("teacher"))
        assert first.status_code == 200
        before = await snapshot(h)
        repeated = await h.client.patch(membership_url(data), json={"status": desired}, headers=bearer("teacher"))
        assert repeated.status_code == 200
        assert repeated.json() == first.json()
        assert await snapshot(h) == before


@pytest.mark.parametrize("body", [{}, {"status": "pending"}, {"status": "ACTIVE"}, {"status": True}, {"status": "active", "role": "admin"}])
async def test_membership_body_is_strict_and_nonmutating(auth_harness, body):
    h = auth_harness
    data = await prepare_memberships(h)
    before = await snapshot(h)
    response = await h.client.patch(membership_url(data), json=body, headers=bearer("teacher"))
    assert response.status_code == 422
    assert await snapshot(h) == before


@pytest.mark.parametrize("actor,expected", [("teacher", 403), ("admin", 409)])
async def test_inactive_cohort_cannot_be_managed(auth_harness, actor, expected):
    h = auth_harness
    data = await prepare_memberships(h)
    async with h.sessions.begin() as session:
        (await session.get(Cohort, data["first"])).is_active = False
    before = await snapshot(h)
    response = await h.client.patch(membership_url(data), json={"status": "removed"}, headers=bearer(actor))
    assert response.status_code == expected
    assert await snapshot(h) == before


async def test_admin_missing_cohort_is_not_found(auth_harness):
    h = auth_harness
    data = await prepare_memberships(h)
    data["first"] = uuid4()
    before = await snapshot(h)
    response = await h.client.patch(membership_url(data), json={"status": "active"}, headers=bearer("admin"))
    assert response.status_code == 404
    assert await snapshot(h) == before
