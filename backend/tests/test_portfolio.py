"""Publication contract against real routes + SQLite; no production DB/storage."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.db.models import Cohort, CohortMembership, CohortState, Progress, User
from tests.test_auth import bearer
from tests.test_workshop_access import activar, pausar, preparar


async def setup(h):
    data = await preparar(h)
    await activar(h, data, "Ju2")
    async with h.sessions.begin() as session:
        author = await session.get(User, data["alumno"])
        author.display_name = "Ana visible"
        author.full_name = "Nombre privado"
        author.description = "Mi presentación"
        author.hobbies = ["Música"]
        viewer = await session.scalar(select(User).where(User.firebase_uid == "stu2"))
        session.add(CohortMembership(user_id=viewer.id, cohort_id=data["cohort"]))
        data["viewer"] = viewer.id
        for key, code in (
            ("e13", "mostrar(crearTitulo(datos.nombre))"),
            ("e11", 'mostrar(crearParrafo("Último"))'),
        ):
            session.add(
                Progress(
                    user_id=author.id,
                    cohort_id=data["cohort"],
                    challenge_id=data["retos"][key],
                    draft_code=code,
                    last_saved_at=datetime.now(UTC),
                )
            )
    return data


async def owner(h, key=None):
    path = "/api/portfolio/publication" + (f"?challenge_key={key}" if key else "")
    response = await h.client.get(path, headers=bearer("alumno"))
    assert response.status_code == 200, response.text
    return response.json()


async def body(h, html="<h1>Mi sitio</h1>"):
    source = (await owner(h))["source"]
    return {
        "challenge_key": source["challenge_key"],
        "source_fingerprint": source["source_fingerprint"],
        "title": "Mi portafolio",
        "snapshot_html": html,
        "visibility": "cohort",
    }


async def publish(h, payload=None):
    response = await h.client.post(
        "/api/portfolio/publication/publish",
        json=payload or await body(h),
        headers=bearer("alumno"),
    )
    assert response.status_code == 200, response.text
    return response.json()["publication"]


async def test_saved_source_has_exact_private_safe_data_and_no_example_projects(auth_harness):
    h = auth_harness
    await setup(h)
    state = await owner(h)
    assert state["publication"] is None
    assert state["can_publish"] is True
    assert state["source"]["challenge_key"] == "e13"
    assert state["source"]["draft_code"] == "mostrar(crearTitulo(datos.nombre))"
    assert state["source"]["datos"] == {
        "nombre": "Ana visible",
        "sobreMi": "Mi presentación",
        "hobbies": ["Música"],
        "redes": [
            {"nombre": "GitHub", "url": ""},
            {"nombre": "LinkedIn", "url": ""},
            {"nombre": "Sitio web", "url": ""},
        ],
        "proyectos": [],
        "skills": [],
    }
    assert [source["challenge_key"] for source in state["sources"]] == ["e13", "e11"]
    assert "@" not in str(state)
    assert "Nombre privado" not in str(state)


async def test_publication_changes_only_on_explicit_publish_and_keeps_slug(auth_harness):
    h = auth_harness
    data = await setup(h)
    first = await publish(h)
    assert first["revision"] == 1
    async with h.sessions.begin() as session:
        source = await session.get(Progress, (data["alumno"], data["cohort"], data["retos"]["e13"]))
        source.draft_code = 'mostrar(crearTitulo("Nuevo"))'
    state = await owner(h)
    assert state["has_unpublished_changes"] is True
    assert state["publication"]["snapshot_html"] == "<h1>Mi sitio</h1>"
    second = await publish(h, await body(h, "<h1>Actualizado</h1>"))
    assert second["slug"] == first["slug"]
    assert second["revision"] == 2
    assert second["snapshot_html"] == "<h1>Actualizado</h1>"
    assert (await owner(h))["has_unpublished_changes"] is False
    async with h.sessions() as session:
        assert (
            await session.get(Progress, (data["alumno"], data["cohort"], data["retos"]["e13"]))
        ).draft_code == 'mostrar(crearTitulo("Nuevo"))'


@pytest.mark.parametrize("change", ["draft", "profile"])
async def test_changed_saved_source_or_profile_rejects_stale_publish(auth_harness, change):
    h = auth_harness
    data = await setup(h)
    payload = await body(h)
    async with h.sessions.begin() as session:
        if change == "draft":
            (
                await session.get(Progress, (data["alumno"], data["cohort"], data["retos"]["e13"]))
            ).draft_code += "\n// edit"
        else:
            (await session.get(User, data["alumno"])).description = "Nueva biografía"
    for action in ("preview", "publish"):
        response = await h.client.post(
            f"/api/portfolio/publication/{action}", json=payload, headers=bearer("alumno")
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "SOURCE_CHANGED"


@pytest.mark.parametrize("state", ["future", "paused", "source_paused"])
async def test_publication_respects_workshop_and_source_gates(auth_harness, state):
    h = auth_harness
    data = await setup(h)
    payload = await body(h)
    if state == "future":
        await activar(h, data, "Mi2")
    else:
        await pausar(h, data, "Ju1" if state == "source_paused" else "Ju2")
    current = await owner(h)
    if state != "source_paused":
        assert current["can_publish"] is False
    for action in ("preview", "publish"):
        response = await h.client.post(
            f"/api/portfolio/publication/{action}", json=payload, headers=bearer("alumno")
        )
        assert response.status_code == 403


@pytest.mark.parametrize(
    "revocation",
    ["author_removed", "viewer_removed", "author_disabled", "cohort_inactive", "foreign_cohort"],
)
async def test_gallery_and_site_revalidate_both_memberships(auth_harness, revocation):
    h = auth_harness
    data = await setup(h)
    publication = await publish(h)
    visible = await h.client.get("/api/cohort/gallery", headers=bearer("otro"))
    assert visible.status_code == 200
    assert len(visible.json()["items"]) == 1
    async with h.sessions.begin() as session:
        if revocation == "author_disabled":
            (await session.get(User, data["alumno"])).is_active = False
        elif revocation == "cohort_inactive":
            (await session.get(Cohort, data["cohort"])).is_active = False
        elif revocation == "foreign_cohort":
            new_cohort = Cohort(name="Otra", slug="otra", join_code_hash="test")
            session.add(new_cohort)
            await session.flush()
            (
                await session.get(CohortMembership, (data["cohort"], data["viewer"]))
            ).status = "removed"
            session.add(CohortMembership(user_id=data["viewer"], cohort_id=new_cohort.id))
        else:
            who = data["alumno"] if revocation == "author_removed" else data["viewer"]
            (await session.get(CohortMembership, (data["cohort"], who))).status = "removed"
    listed = await h.client.get("/api/cohort/gallery", headers=bearer("otro"))
    assert listed.status_code == 403 or listed.json()["items"] == []
    for suffix in ("", "/avatar"):
        detail = await h.client.get(
            f"/api/cohort/portfolios/{publication['slug']}{suffix}", headers=bearer("otro")
        )
        assert detail.status_code in {403, 404}


async def test_removed_owner_can_unpublish_without_modifying_source(auth_harness):
    h = auth_harness
    data = await setup(h)
    first = await publish(h)
    async with h.sessions.begin() as session:
        (await session.get(CohortMembership, (data["cohort"], data["alumno"]))).status = "removed"
    response = await h.client.post(
        "/api/portfolio/publication/unpublish", json={}, headers=bearer("alumno")
    )
    assert response.status_code == 200
    assert response.json()["publication"]["is_published"] is False
    async with h.sessions() as session:
        assert (
            await session.get(Progress, (data["alumno"], data["cohort"], data["retos"]["e13"]))
        ).draft_code
    detail = await h.client.get(f"/api/cohort/portfolios/{first['slug']}", headers=bearer("otro"))
    assert detail.status_code == 404


async def test_publication_rejects_cohort_owner_and_public_visibility_injection(auth_harness):
    h = auth_harness
    data = await setup(h)
    payload = await body(h)
    for extra in (
        {"cohort_id": str(data["cohort"])},
        {"user_id": str(data["viewer"])},
        {"visibility": "public"},
    ):
        response = await h.client.post(
            "/api/portfolio/publication/publish",
            json={**payload, **extra},
            headers=bearer("alumno"),
        )
        assert response.status_code == 422
    assert (await h.client.get("/api/cohort/gallery")).status_code == 401
    assert (await h.client.get("/api/public/portfolios/anything")).status_code == 404


async def test_preview_sanitizes_before_publish_and_visitor_schema_hides_source(auth_harness):
    h = auth_harness
    await setup(h)
    payload = await body(
        h,
        '<h1 onclick="bad()">Hola</h1><script>bad()</script><img src="https://tracker.invalid/x" onerror="bad()">',
    )
    preview = await h.client.post(
        "/api/portfolio/publication/preview", json=payload, headers=bearer("alumno")
    )
    assert preview.status_code == 200, preview.text
    clean = preview.json()["snapshot_html"]
    assert "<h1>Hola</h1>" in clean
    assert "bad" not in clean
    assert "tracker" not in clean
    assert (await owner(h))["publication"] is None
    publication = await publish(h, {**payload, "snapshot_html": clean})
    assert publication["snapshot_html"] == clean
    detail = await h.client.get(
        f"/api/cohort/portfolios/{publication['slug']}", headers=bearer("otro")
    )
    assert detail.status_code == 200
    assert set(detail.json()) == {
        "slug",
        "title",
        "display_name",
        "has_avatar",
        "snapshot_html",
        "updated_at",
    }
    assert detail.headers["cache-control"] == "no-store"
    for private in (
        "source",
        "draft_code",
        "firebase_uid",
        "email",
        "cohort_id",
        "user_id",
        "avatar_path",
    ):
        assert private not in detail.json()


async def test_grid_document_source_preserved_and_profile_change_marks_unpublished(auth_harness):
    import json

    h = auth_harness
    data = await setup(h)
    document = json.dumps(
        {
            "version": 1,
            "main": "mostrar(cabecera)",
            "estructura": {"filas": 1, "columnas": 1},
            "secciones": [{"nombre": "cabecera", "contenido": 'mostrar(crearTitulo("Hola"))'}],
        },
        ensure_ascii=False,
    )
    async with h.sessions.begin() as session:
        (
            await session.get(Progress, (data["alumno"], data["cohort"], data["retos"]["e13"]))
        ).draft_code = document
    first_source = (await owner(h))["source"]
    assert first_source["draft_code"] == document
    await publish(h)
    async with h.sessions.begin() as session:
        (await session.get(User, data["alumno"])).hobbies = ["Lectura", "Código"]
    state = await owner(h)
    assert state["source"]["draft_code"] == document
    assert state["source"]["source_fingerprint"] != first_source["source_fingerprint"]
    assert state["has_unpublished_changes"] is True


async def test_unknown_or_unsaved_source_is_not_replaced_by_someone_elses_code(auth_harness):
    h = auth_harness
    data = await setup(h)
    async with h.sessions.begin() as session:
        session.add(
            Progress(
                user_id=data["viewer"],
                cohort_id=data["cohort"],
                challenge_id=data["retos"]["e12"],
                draft_code="private-other-code",
            )
        )
    for key in ("e12", "e99"):
        response = await h.client.get(
            f"/api/portfolio/publication?challenge_key={key}", headers=bearer("alumno")
        )
        assert response.status_code == 404
        assert "private-other-code" not in response.text
    explicit = await owner(h, "e11")
    assert explicit["source"]["challenge_key"] == "e11"


async def test_public_flag_cannot_enable_unsupported_public_access(auth_harness):
    from app.db.models import FeatureFlag

    h = auth_harness
    await setup(h)
    async with h.sessions.begin() as session:
        session.add(FeatureFlag(key="public_portfolios", enabled=True))
    publication = await publish(h)
    for path in (
        f"/api/public/portfolios/{publication['slug']}",
        f"/public/portfolios/{publication['slug']}",
    ):
        assert (await h.client.get(path)).status_code == 404
    payload = await body(h)
    response = await h.client.post(
        "/api/portfolio/publication/publish",
        headers=bearer("alumno"),
        json={**payload, "visibility": "public"},
    )
    assert response.status_code == 422


async def test_publish_after_new_membership_moves_access_without_exposing_old_source(auth_harness):
    h = auth_harness
    data = await setup(h)
    first = await publish(h)
    old_payload = await body(h)
    async with h.sessions.begin() as session:
        cohort = Cohort(name="Nueva clase", slug="nueva-clase", join_code_hash="fake")
        session.add(cohort)
        await session.flush()
        session.add_all(
            [
                CohortMembership(
                    user_id=data["alumno"], cohort_id=cohort.id, joined_at=datetime.now(UTC)
                ),
                CohortState(cohort_id=cohort.id, active_session_id=data["sesiones"]["Ju2"]),
                Progress(
                    user_id=data["alumno"],
                    cohort_id=cohort.id,
                    challenge_id=data["retos"]["e13"],
                    draft_code="different cohort source",
                ),
            ]
        )
    stale = await h.client.post(
        "/api/portfolio/publication/publish", headers=bearer("alumno"), json=old_payload
    )
    assert stale.status_code == 409
    assert (await owner(h))["source"]["draft_code"] == "different cohort source"
    second = await publish(h)
    assert second["slug"] == first["slug"]
    assert (
        await h.client.get(f"/api/cohort/portfolios/{first['slug']}", headers=bearer("otro"))
    ).status_code == 404


async def test_avatar_proxy_returns_only_image_bytes_and_rechecks_membership(
    auth_harness, monkeypatch
):
    import io

    import httpx
    from PIL import Image

    from app.core.config import Settings
    from app.profile import storage

    h = auth_harness
    data = await setup(h)
    async with h.sessions.begin() as session:
        (await session.get(User, data["alumno"])).avatar_path = f"{data['alumno']}/avatar.webp"
    publication = await publish(h)
    h.app.state.settings = Settings(
        _env_file=None,
        supabase_url="https://storage.example.invalid",
        supabase_secret_key="fake-test-only",
    )
    output = io.BytesIO()
    Image.new("RGB", (64, 64), "blue").save(output, format="WEBP")
    downloaded = []

    async def respond(request):
        downloaded.append(request.url.path)
        assert request.headers["Authorization"] == "Bearer fake-test-only"
        return httpx.Response(
            200, content=output.getvalue(), headers={"Content-Type": "image/webp"}
        )

    client = httpx.AsyncClient
    monkeypatch.setattr(
        storage.httpx,
        "AsyncClient",
        lambda **kwargs: client(transport=httpx.MockTransport(respond), **kwargs),
    )
    path = f"/api/cohort/portfolios/{publication['slug']}/avatar"
    response = await h.client.get(path, headers=bearer("otro"))
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/webp"
    assert response.headers["cache-control"] == "no-store"
    assert Image.open(io.BytesIO(response.content)).format == "WEBP"
    assert downloaded == [f"/storage/v1/object/authenticated/avatars/{data['alumno']}/avatar.webp"]
    async with h.sessions.begin() as session:
        (await session.get(CohortMembership, (data["cohort"], data["viewer"]))).status = "removed"
    assert (await h.client.get(path, headers=bearer("otro"))).status_code == 403
    assert len(downloaded) == 1


async def test_unpublish_during_paused_day_is_idempotent_and_slug_reusable(auth_harness):
    h = auth_harness
    data = await setup(h)
    first = await publish(h)
    await pausar(h, data, "Ju2")
    for _ in range(2):
        response = await h.client.post(
            "/api/portfolio/publication/unpublish", headers=bearer("alumno")
        )
        assert response.status_code == 200
        assert response.json()["publication"]["is_published"] is False
    await pausar(h, data, "Ju2", False)
    again = await publish(h)
    assert again["slug"] == first["slug"]
    assert again["revision"] == 2
