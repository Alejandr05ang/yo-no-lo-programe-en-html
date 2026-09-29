"""Release account-switch probes through real API routes and local fixtures only.

One HTTP client alternates A, unauthenticated, B, unauthenticated, A. Browser
logout/cache/Monaco behavior is covered separately by the frontend release gate.
Avatar storage is in-memory; no production database or storage is contacted.
"""

import io
import json

import pytest
from PIL import Image
from sqlalchemy import select

from app.db.models import CohortMembership, Progress, Submission, User
from app.profile import routes as profile_routes
from tests.test_auth import bearer
from tests.test_workshop_access import activar, preparar

ACTORS = ("alumno", "otro")


def profile(actor):
    return {
        "full_name": f"Private full name {actor}",
        "display_name": f"Public name {actor}",
        "description": f"Biography {actor}",
        "hobbies": [f"Hobby {actor}", f"Second hobby {actor}"],
        "github_url": f"https://github.com/{actor}",
        "linkedin_url": f"https://www.linkedin.com/in/{actor}",
        "website_url": f"https://example.com/{actor}",
    }


def code(actor, key):
    return json.dumps({
        "version": 1,
        "main": "mostrar(cabecera)",
        "estructura": {"filas": 1, "columnas": 1},
        "secciones": [{
            "nombre": "cabecera",
            "contenido": f'mostrar(crearTitulo("PRIVATE-{actor}-{key}"))',
        }],
    })


async def prepare_accounts(h):
    data = await preparar(h)
    await activar(h, data, "Ju2")
    async with h.sessions.begin() as session:
        other = await session.scalar(select(User).where(User.firebase_uid == "stu2"))
        data["otro"] = other.id
        session.add(CohortMembership(cohort_id=data["cohort"], user_id=other.id))
    return data


async def read_private(h, actor, path):
    response = await h.client.get(path, headers=bearer(actor))
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    return response.json()


async def save_code(h, actor, key, **fields):
    response = await h.client.put(
        f"/api/challenges/{key}/progress",
        headers=bearer(actor),
        json={"status": "in_progress", "draft_code": code(actor, key), **fields},
    )
    assert response.status_code == 200, response.text
    # Compare persisted responses consistently: SQLite drops timezone suffixes
    # on datetime reload while the production PostgreSQL columns preserve them.
    return await read_private(h, actor, f"/api/challenges/{key}/progress")


async def test_profile_avatar_hobbies_and_socials_survive_a_b_a_without_owner_injection(
    auth_harness, monkeypatch
):
    h = auth_harness
    data = await prepare_accounts(h)
    objects = {}

    class LocalAvatarStorage:
        def __init__(self, _settings):
            pass

        async def upload(self, path, content):
            objects[path] = content

        async def signed_url(self, path):
            assert path in objects
            return f"https://avatars.example.invalid/{path}?local-test-signature"

    monkeypatch.setattr(profile_routes, "AvatarStorage", LocalAvatarStorage)
    saved_users = {}
    avatar_views = {}
    for actor, color in zip(ACTORS, ("red", "blue"), strict=True):
        if actor == "otro":
            before = await read_private(h, actor, "/api/me")
            assert before["user"]["hobbies"] == []
            assert before["user"]["avatar_path"] is None
            assert before["user"]["github_url"] is None
            assert (
                await h.client.get("/api/profile/avatar", headers=bearer(actor))
            ).status_code == 404
        response = await h.client.put("/api/profile", headers=bearer(actor), json=profile(actor))
        assert response.status_code == 200, response.text
        image = io.BytesIO()
        Image.new("RGB", (32, 32), color).save(image, format="PNG")
        response = await h.client.post(
            "/api/profile/avatar", headers=bearer(actor),
            files={"avatar": ("avatar.png", image.getvalue(), "image/png")},
        )
        assert response.status_code == 200, response.text
        avatar_views[actor] = response.json()
        saved_users[actor] = (await read_private(h, actor, "/api/me"))["user"]
        assert saved_users[actor]["avatar_path"] == f"{data[actor]}/avatar.webp"
        for field, value in profile(actor).items():
            assert saved_users[actor][field] == value
        for path in ("/api/me", "/api/profile/avatar"):
            assert (await h.client.get(path)).status_code == 401

    # Owner identifiers in a GET cannot redirect the authenticated resource.
    assert await read_private(
        h, "otro", f"/api/profile/avatar?user_id={data['alumno']}&avatar_path={data['alumno']}/avatar.webp"
    ) == avatar_views["otro"]
    for forged in ({"user_id": str(data["alumno"])}, {"avatar_path": f"{data['alumno']}/avatar.webp"}):
        response = await h.client.put(
            "/api/profile", headers=bearer("otro"), json={**profile("otro"), **forged}
        )
        assert response.status_code == 422
    for actor in ("alumno", "otro", "alumno"):
        assert (await read_private(h, actor, "/api/me"))["user"] == saved_users[actor]
        assert await read_private(h, actor, "/api/profile/avatar") == avatar_views[actor]
    assert set(objects) == {f"{data[actor]}/avatar.webp" for actor in ACTORS}
    assert objects[f"{data['alumno']}/avatar.webp"] != objects[f"{data['otro']}/avatar.webp"]


@pytest.mark.parametrize("key", ["e12", "e13"])
async def test_draft_accepted_autosave_and_attempts_are_private_across_a_b_a(auth_harness, key):
    h = auth_harness
    data = await prepare_accounts(h)
    path = f"/api/challenges/{key}/progress"
    accepted = await save_code(h, "alumno", key, status="accepted", cases_passed=2, cases_total=2)
    assert accepted["accepted_at"] is not None
    first_submit = await h.client.post(
        f"/api/challenges/{key}/submit", headers=bearer("alumno"),
        json={"code_submitted": code("alumno", key)},
    )
    assert first_submit.status_code == 200, first_submit.text
    assert first_submit.json()["attempt_number"] == 1
    original_a = await read_private(h, "alumno", path)
    assert (await h.client.get(path)).status_code == 401
    empty_b = await read_private(h, "otro", f"{path}?user_id={data['alumno']}")
    assert empty_b["status"] == "not_started"
    assert empty_b["draft_code"] == ""
    assert empty_b["attempts_count"] == 0
    assert empty_b["accepted_at"] is None
    await save_code(h, "otro", key)
    for attempt in (1, 2):
        response = await h.client.post(
            f"/api/challenges/{key}/submit", headers=bearer("otro"),
            json={"code_submitted": code("otro", key)},
        )
        assert response.status_code == 200, response.text
        assert response.json()["attempt_number"] == attempt
    for injected in ("user_id", "cohort_id"):
        denied = await h.client.put(
            path, headers=bearer("otro"),
            json={"draft_code": "INJECTED", injected: str(data["alumno"] if injected == "user_id" else data["cohort"])},
        )
        assert denied.status_code == 422
    original_b = await read_private(h, "otro", path)
    assert (await h.client.get(path)).status_code == 401
    assert await read_private(h, "alumno", path) == original_a

    # Re-entering A and autosaving an accepted task must retain A's achievement;
    # neither the accepted state nor the new code may be inherited by B.
    edited_a = await save_code(h, "alumno", key, draft_code=f"{code('alumno', key)}\n// autosave A")
    assert edited_a["status"] == "accepted"
    assert edited_a["accepted_at"] == accepted["accepted_at"]
    assert edited_a["attempts_count"] == 1
    assert await read_private(h, "otro", path) == original_b
    assert await read_private(h, "alumno", path) == edited_a
    for actor, expected in (("alumno", "accepted"), ("otro", "in_progress"), ("alumno", "accepted")):
        for map_path in ("/api/map", "/api/map/sessions/Ju1"):
            view = await read_private(h, actor, map_path)
            days = view["sessions"] if "sessions" in view else [view]
            matching = [challenge for day in days for challenge in day["challenges"] if challenge["key"] == key]
            assert len(matching) == 1
            assert matching[0]["progress_status"] == expected
    async with h.sessions() as session:
        progress = (await session.scalars(select(Progress))).all()
        assert {(row.user_id, row.challenge_id) for row in progress} == {
            (data[actor], data["retos"][key]) for actor in ACTORS
        }
        submissions = (await session.scalars(select(Submission))).all()
        assert len(submissions) == 3
        for row in submissions:
            actor = "alumno" if row.user_id == data["alumno"] else "otro"
            assert row.code_submitted == code(actor, key)


async def test_publication_source_dirty_state_and_unpublish_remain_owned_after_switch(auth_harness):
    h = auth_harness
    data = await prepare_accounts(h)
    for actor in ACTORS:
        response = await h.client.put("/api/profile", headers=bearer(actor), json=profile(actor))
        assert response.status_code == 200, response.text
    for key in ("e12", "e13"):
        await save_code(h, "alumno", key)
    owner_path = "/api/portfolio/publication?challenge_key=e13"
    source_a = (await read_private(h, "alumno", owner_path))["source"]
    payload_a = {
        "challenge_key": "e13", "source_fingerprint": source_a["source_fingerprint"],
        "title": "Published A", "snapshot_html": "<h1>Public snapshot A</h1>", "visibility": "cohort",
    }
    published_a = await h.client.post(
        "/api/portfolio/publication/publish", headers=bearer("alumno"), json=payload_a,
    )
    assert published_a.status_code == 200, published_a.text
    original_a = await read_private(h, "alumno", owner_path)
    assert original_a["has_unpublished_changes"] is False
    slug_a = original_a["publication"]["slug"]
    for path in ("/api/portfolio/publication", "/api/cohort/gallery", f"/api/cohort/portfolios/{slug_a}"):
        assert (await h.client.get(path)).status_code == 401

    empty_b = await read_private(h, "otro", f"/api/portfolio/publication?user_id={data['alumno']}")
    assert empty_b["publication"] is None
    assert empty_b["source"] is None
    assert empty_b["sources"] == []
    assert empty_b["has_unpublished_changes"] is False
    for key in ("e12", "e13"):
        denied = await h.client.get(f"/api/portfolio/publication?challenge_key={key}", headers=bearer("otro"))
        assert denied.status_code == 404
        assert "PRIVATE-alumno" not in denied.text
        await save_code(h, "otro", key)
    for action in ("preview", "publish"):
        replay = await h.client.post(
            f"/api/portfolio/publication/{action}", headers=bearer("otro"), json=payload_a,
        )
        assert replay.status_code == 409
        assert replay.json()["error"]["code"] == "SOURCE_CHANGED"
    for actor in ("alumno", "otro", "alumno"):
        other = "otro" if actor == "alumno" else "alumno"
        for key in ("e12", "e13"):
            own = await read_private(h, actor, f"/api/portfolio/publication?challenge_key={key}")
            assert own["source"]["draft_code"] == code(actor, key)
            assert own["source"]["datos"]["hobbies"] == profile(actor)["hobbies"]
            assert own["source"]["datos"]["nombre"] == profile(actor)["display_name"]
            assert "PRIVATE-" + other not in json.dumps(own)
    source_b = (await read_private(h, "otro", owner_path))["source"]
    payload_b = {
        **payload_a, "source_fingerprint": source_b["source_fingerprint"],
        "title": "Published B", "snapshot_html": "<h1>Public snapshot B</h1>",
    }
    published_b = await h.client.post(
        "/api/portfolio/publication/publish", headers=bearer("otro"), json=payload_b,
    )
    assert published_b.status_code == 200, published_b.text
    original_b = await read_private(h, "otro", owner_path)
    assert original_b["has_unpublished_changes"] is False
    assert original_b["publication"]["slug"] != slug_a
    assert await read_private(h, "alumno", owner_path) == original_a

    # Classmates intentionally see published snapshots, never private owner DTOs.
    gallery = await read_private(h, "otro", "/api/cohort/gallery")
    assert {item["slug"] for item in gallery["items"]} == {
        slug_a, original_b["publication"]["slug"],
    }
    for item in gallery["items"]:
        assert set(item) == {"slug", "title", "display_name", "has_avatar", "updated_at"}
    detail = await read_private(h, "otro", f"/api/cohort/portfolios/{slug_a}")
    assert detail["snapshot_html"] == payload_a["snapshot_html"]
    assert set(detail) == {"slug", "title", "display_name", "has_avatar", "updated_at", "snapshot_html"}
    assert "PRIVATE-alumno" not in json.dumps(detail)

    changed = await h.client.put(
        "/api/profile", headers=bearer("alumno"),
        json={**profile("alumno"), "hobbies": ["Changed only A"]},
    )
    assert changed.status_code == 200, changed.text
    changed_a = await read_private(h, "alumno", owner_path)
    assert changed_a["has_unpublished_changes"] is True
    assert changed_a["publication"] == original_a["publication"]
    assert await read_private(h, "otro", owner_path) == original_b
    await save_code(h, "otro", "e13", draft_code=code("otro", "e13") + "\n// autosave B")
    assert (await read_private(h, "otro", owner_path))["has_unpublished_changes"] is True
    assert await read_private(h, "alumno", owner_path) == changed_a

    # Even an injected body cannot make B's unpublish operate on A's row.
    unpublished_b = await h.client.post(
        "/api/portfolio/publication/unpublish", headers=bearer("otro"),
        json={"user_id": str(data["alumno"]), "slug": slug_a},
    )
    assert unpublished_b.status_code == 200, unpublished_b.text
    assert unpublished_b.json()["publication"]["is_published"] is False
    assert await read_private(h, "alumno", owner_path) == changed_a
    final_gallery = await read_private(h, "alumno", "/api/cohort/gallery")
    assert [item["slug"] for item in final_gallery["items"]] == [slug_a]
