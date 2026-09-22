import io
from datetime import UTC, datetime

import pytest
from PIL import Image

from app.auth.firebase import FirebaseIdentity
from app.cohorts.service import hash_join_code
from app.db.models import Challenge, Cohort, CohortMembership, CohortState, SessionCatalog, User
from app.profile.service import process_avatar


def identity(uid="student", email="student@example.test", verified=True):
    return FirebaseIdentity(uid=uid, email=email, email_verified=verified, provider="password")


@pytest.mark.asyncio
async def test_profile_forbids_mass_assignment_and_requires_https(auth_harness):
    auth_harness.identities["token"] = identity()
    await auth_harness.client.post("/api/auth/bootstrap", headers={"Authorization": "Bearer token"})
    valid = {
        "full_name": "Ana Rivas",
        "display_name": "Ana",
        "description": "Aprendo desarrollo web.",
        "website_url": "https://example.test/ana",
    }
    response = await auth_harness.client.put(
        "/api/profile", json={**valid, "role": "admin"}, headers={"Authorization": "Bearer token"}
    )
    assert response.status_code == 422
    response = await auth_harness.client.put(
        "/api/profile",
        json={**valid, "website_url": "http://localhost/private"},
        headers={"Authorization": "Bearer token"},
    )
    assert response.status_code == 422
    response = await auth_harness.client.put(
        "/api/profile", json=valid, headers={"Authorization": "Bearer token"}
    )
    assert response.status_code == 200
    assert response.json()["onboarding"] == {"state": "JOIN_CLASS_REQUIRED"}
    assert response.json()["user"]["role"] == "student"


def test_avatar_decodes_and_reencodes_without_metadata():
    source = io.BytesIO()
    Image.new("RGBA", (900, 600), (120, 50, 20, 128)).save(source, format="PNG", pnginfo=None)
    processed = process_avatar(source.getvalue())
    with Image.open(io.BytesIO(processed)) as image:
        assert image.format == "WEBP"
        assert image.mode == "RGB"
        assert max(image.size) <= 512
        assert not image.getexif()


@pytest.mark.asyncio
async def test_join_is_verified_profile_gated_and_idempotent(auth_harness):
    auth_harness.identities["token"] = identity()
    await auth_harness.client.post("/api/auth/bootstrap", headers={"Authorization": "Bearer token"})
    async with auth_harness.sessions() as session, session.begin():
        session.add(
            Cohort(
                name="Cohorte prueba",
                slug="cohorte-prueba",
                join_code_hash=hash_join_code("SUMMER-2026"),
            )
        )
    blocked = await auth_harness.client.post(
        "/api/cohorts/join",
        json={"code": "SUMMER-2026"},
        headers={"Authorization": "Bearer token"},
    )
    assert blocked.status_code == 403
    async with auth_harness.sessions() as session, session.begin():
        user = await session.scalar(__import__("sqlalchemy").select(User))
        user.profile_completed_at = datetime.now(UTC)
    first = await auth_harness.client.post(
        "/api/cohorts/join",
        json={"code": "SUMMER-2026"},
        headers={"Authorization": "Bearer token"},
    )
    second = await auth_harness.client.post(
        "/api/cohorts/join",
        json={"code": "SUMMER-2026"},
        headers={"Authorization": "Bearer token"},
    )
    assert first.status_code == second.status_code == 200
    assert first.json()["joined"] is True
    assert second.json()["joined"] is False


@pytest.mark.asyncio
async def test_map_has_teasers_but_future_detail_is_forbidden(auth_harness):
    auth_harness.identities["token"] = identity()
    await auth_harness.client.post("/api/auth/bootstrap", headers={"Authorization": "Bearer token"})
    async with auth_harness.sessions() as session, session.begin():
        user = await session.scalar(__import__("sqlalchemy").select(User))
        user.profile_completed_at = datetime.now(UTC)
        cohort = Cohort(name="Cohorte", slug="cohorte", join_code_hash="sha256:test")
        current = SessionCatalog(
            code="Ma1", day_number=2, order_index=2, title="Variables", is_published=True
        )
        future = SessionCatalog(
            code="Mi1", day_number=3, order_index=3, title="Bucles", is_published=True
        )
        session.add_all([cohort, current, future])
        await session.flush()
        session.add_all(
            [
                CohortMembership(cohort_id=cohort.id, user_id=user.id),
                CohortState(cohort_id=cohort.id, active_session_id=current.id),
                Challenge(
                    session_id=future.id,
                    key="e4",
                    title="Redes",
                    teaser_summary="Una mirada al próximo encargo.",
                    instructions="INSTRUCCION_PROTEGIDA",
                    status="published",
                ),
            ]
        )
    response = await auth_harness.client.get("/api/map", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    body = response.json()
    assert "INSTRUCCION_PROTEGIDA" not in str(body)
    assert body["sessions"][1]["state"] == "future"

    # Las sesiones se piden por su codigo publico, no por UUID.
    abierta = await auth_harness.client.get(
        "/api/map/sessions/Ma1", headers={"Authorization": "Bearer token"}
    )
    assert abierta.status_code == 200
    assert abierta.json()["code"] == "Ma1"
    assert abierta.json()["day_number"] == 2

    locked = await auth_harness.client.get(
        "/api/map/sessions/Mi1", headers={"Authorization": "Bearer token"}
    )
    assert locked.status_code == 403
    assert locked.json()["error"]["code"] == "SESSION_LOCKED"


@pytest.mark.asyncio
async def test_active_session_opens_even_without_challenges(auth_harness):
    """Una sesion sin encargos sigue siendo una sesion que el alumno puede abrir.

    Es el caso de L1 en el taller real: dia de diagnostico, cero encargos. Antes el
    mapa no ofrecia forma de entrar y la sesion quedaba muerta.
    """
    auth_harness.identities["token"] = identity()
    await auth_harness.client.post("/api/auth/bootstrap", headers={"Authorization": "Bearer token"})
    async with auth_harness.sessions() as session, session.begin():
        user = await session.scalar(__import__("sqlalchemy").select(User))
        user.profile_completed_at = datetime.now(UTC)
        cohort = Cohort(name="Cohorte", slug="cohorte-l1", join_code_hash="sha256:l1")
        vacia = SessionCatalog(
            code="L1", day_number=1, order_index=1, title="Diagnostico", is_published=True
        )
        session.add_all([cohort, vacia])
        await session.flush()
        session.add_all(
            [
                CohortMembership(cohort_id=cohort.id, user_id=user.id),
                CohortState(cohort_id=cohort.id, active_session_id=vacia.id),
            ]
        )

    res = await auth_harness.client.get(
        "/api/map/sessions/L1", headers={"Authorization": "Bearer token"}
    )
    assert res.status_code == 200
    assert res.json()["code"] == "L1"
    assert res.json()["challenges"] == []
    assert res.json()["preview"] is False


@pytest.mark.asyncio
async def test_admin_previews_any_session_without_membership(auth_harness):
    """El admin revisa el material antes de abrirlo, sin estar matriculado."""
    from app.db.models import AdminAllowlist

    auth_harness.identities["admin"] = identity(uid="adm", email="jefe@example.com")
    async with auth_harness.sessions() as session, session.begin():
        session.add(AdminAllowlist(email="jefe@example.com", active=True))
    await auth_harness.client.post("/api/auth/bootstrap", headers={"Authorization": "Bearer admin"})
    async with auth_harness.sessions() as session, session.begin():
        session.add(
            SessionCatalog(
                code="V2", day_number=10, order_index=10, title="Cierre", is_published=True
            )
        )

    res = await auth_harness.client.get(
        "/api/map/sessions/V2", headers={"Authorization": "Bearer admin"}
    )
    assert res.status_code == 200
    assert res.json()["preview"] is True

    # Y una que no existe sigue siendo 404, no un 200 vacio.
    assert (
        await auth_harness.client.get(
            "/api/map/sessions/NOEXISTE", headers={"Authorization": "Bearer admin"}
        )
    ).status_code == 404
