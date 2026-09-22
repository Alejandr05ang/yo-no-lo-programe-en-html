import httpx
import pytest

from app.core.config import Settings
from app.main import create_app


def identity(uid="student-uid", email="student@example.invalid", verified=True):
    from app.auth.firebase import FirebaseIdentity

    return FirebaseIdentity(uid=uid, email=email, email_verified=verified, provider="password")


def bearer(token="student-token"):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize(
    "method,path",
    [("POST", "/api/auth/bootstrap"), ("GET", "/api/me"), ("GET", "/api/me/onboarding")],
)
async def test_auth_routes_require_bearer(method, path):
    app = create_app(Settings(_env_file=None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        response = await c.request(method, path)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"


async def test_unconfigured_auth_fails_closed():
    app = create_app(Settings(_env_file=None, firebase_project_id=None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        response = await c.post("/api/auth/bootstrap", headers={"Authorization": "Bearer token"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AUTH_NOT_CONFIGURED"


async def test_bootstrap_persists_identity_and_is_idempotent(auth_harness):
    from sqlalchemy import func, select

    from app.db.models import User

    h = auth_harness
    h.identities["student-token"] = identity(email="Student@Example.Invalid")
    first = await h.client.post("/api/auth/bootstrap", headers=bearer())
    second = await h.client.post("/api/auth/bootstrap", headers=bearer())
    assert first.status_code == second.status_code == 200
    assert first.json()["user"]["id"] == second.json()["user"]["id"]
    assert first.json()["user"]["email"] == "student@example.invalid"
    assert first.json()["user"]["role"] == "student"
    assert first.json()["onboarding"] == {"state": "PROFILE_REQUIRED"}
    assert "firebase_uid" not in first.json()["user"]
    async with h.sessions() as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 1
        user = await session.scalar(select(User))
        assert user.firebase_uid == "student-uid"


@pytest.mark.parametrize(
    "payload",
    [
        {"role": "admin"},
        {"firebase_uid": "other"},
        {"email": "admin@example.invalid"},
        {"email_verified": True},
        {"is_active": True},
        {"password": "SECRET_SENTINEL"},
    ],
)
async def test_bootstrap_rejects_mass_assignment(auth_harness, payload):
    h = auth_harness
    h.identities["student-token"] = identity()
    response = await h.client.post("/api/auth/bootstrap", headers=bearer(), json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "SECRET_SENTINEL" not in response.text


@pytest.mark.parametrize(
    "verified,active,role,state",
    [
        (True, True, "admin", "PROFILE_REQUIRED"),
        (False, True, "student", "EMAIL_VERIFICATION_REQUIRED"),
        (True, False, "student", "PROFILE_REQUIRED"),
    ],
)
async def test_admin_requires_verified_email_and_active_allowlist(
    auth_harness, verified, active, role, state
):
    from app.db.models import AdminAllowlist

    h = auth_harness
    h.identities["student-token"] = identity(verified=verified)
    async with h.sessions.begin() as session:
        session.add(AdminAllowlist(email="student@example.invalid", active=active))
    response = await h.client.post("/api/auth/bootstrap", headers=bearer())
    assert response.status_code == 200
    assert response.json()["user"]["role"] == role
    assert response.json()["onboarding"]["state"] == state


async def test_email_collision_never_reassigns_existing_identity(auth_harness):
    from sqlalchemy import select

    from app.db.models import User

    h = auth_harness
    h.identities["student-token"] = identity()
    await h.client.post("/api/auth/bootstrap", headers=bearer())
    h.identities["intruder"] = identity(uid="different-uid")
    response = await h.client.post("/api/auth/bootstrap", headers=bearer("intruder"))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "IDENTITY_CONFLICT"
    async with h.sessions() as session:
        assert (await session.scalar(select(User))).firebase_uid == "student-uid"


async def test_me_requires_prior_bootstrap(auth_harness):
    h = auth_harness
    h.identities["student-token"] = identity()
    response = await h.client.get("/api/me", headers=bearer())
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "BOOTSTRAP_REQUIRED"


async def test_me_reads_current_db_role_and_denies_deactivated_user(auth_harness):
    from sqlalchemy import select

    from app.db.models import User

    h = auth_harness
    h.identities["student-token"] = identity()
    await h.client.post("/api/auth/bootstrap", headers=bearer())
    async with h.sessions.begin() as session:
        user = await session.scalar(select(User))
        user.role = "instructor"
    response = await h.client.get("/api/me", headers=bearer())
    assert response.json()["user"]["role"] == "instructor"
    async with h.sessions.begin() as session:
        user = await session.scalar(select(User))
        user.is_active = False
    assert (await h.client.get("/api/me", headers=bearer())).status_code == 403
    assert (await h.client.post("/api/auth/bootstrap", headers=bearer())).status_code == 403


async def test_changed_email_does_not_keep_old_admin_privilege(auth_harness):
    from app.db.models import AdminAllowlist

    h = auth_harness
    h.identities["student-token"] = identity()
    async with h.sessions.begin() as session:
        session.add(AdminAllowlist(email="student@example.invalid"))
    assert (await h.client.post("/api/auth/bootstrap", headers=bearer())).json()["user"][
        "role"
    ] == "admin"
    h.identities["student-token"] = identity(email="changed@example.invalid")
    response = await h.client.get("/api/me", headers=bearer())
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ADMIN_IDENTITY_REVALIDATION_REQUIRED"


@pytest.mark.parametrize("token", ["invalid", "expired", "revoked"])
async def test_invalid_expired_and_revoked_token_fail_closed(auth_harness, token):
    from app.core.errors import ApiError

    h = auth_harness
    h.identities[token] = ApiError(401, "INVALID_TOKEN", "Sesión inválida.")
    response = await h.client.post("/api/auth/bootstrap", headers=bearer(token))
    assert response.status_code == 401


@pytest.mark.parametrize("role", ["admin", "instructor"])
async def test_staff_does_not_need_student_cohort_to_finish_onboarding(auth_harness, role):
    from datetime import UTC, datetime

    from app.db.models import AdminAllowlist, User

    h = auth_harness
    h.identities["student-token"] = identity()
    async with h.sessions.begin() as session:
        session.add(
            User(
                firebase_uid="student-uid",
                email="student@example.invalid",
                role=role,
                profile_completed_at=datetime.now(UTC),
                email_verified=True,
            )
        )
        if role == "admin":
            session.add(AdminAllowlist(email="student@example.invalid"))
    response = await h.client.get("/api/me/onboarding", headers=bearer())
    assert response.status_code == 200
    assert response.json() == {"state": "READY"}


async def test_concurrent_bootstrap_converges_on_one_uid(auth_harness):
    import asyncio

    from sqlalchemy import func, select

    from app.db.models import User

    h = auth_harness
    h.identities["student-token"] = identity()
    responses = await asyncio.gather(
        *[h.client.post("/api/auth/bootstrap", headers=bearer()) for _ in range(4)]
    )
    assert [response.status_code for response in responses] == [200, 200, 200, 200]
    assert len({response.json()["user"]["id"] for response in responses}) == 1
    async with h.sessions() as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 1
