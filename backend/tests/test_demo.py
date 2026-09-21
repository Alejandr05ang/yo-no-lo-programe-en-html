
import pytest

from app.demo.schemas import MAX_DRAFT_CODE_BYTES, MAX_STATE_BYTES
from tests.test_auth import bearer, identity


@pytest.mark.asyncio
async def test_demo_progress_get_empty(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="demo1", email="s@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))

    res = await auth_harness.client.get("/api/demo/progress", headers=bearer("stu1"))
    assert res.status_code == 200
    data = res.json()
    assert data["schema_version"] == 1
    assert data["state"] == {}
    assert data["draft_code"] is None
    # Nothing saved yet, so the client can tell this apart from a restored level.
    assert data["updated_at"] is None


@pytest.mark.asyncio
async def test_demo_progress_put_and_get(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="demo1", email="s@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))

    payload = {
        "schema_version": 2,
        "state": {"player": {"x": 10}},
        "draft_code": "print('hello')"
    }
    res_put = await auth_harness.client.put("/api/demo/progress", headers=bearer("stu1"), json=payload)
    assert res_put.status_code == 200
    assert res_put.json()["updated_at"] is not None

    res_get = await auth_harness.client.get("/api/demo/progress", headers=bearer("stu1"))
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["schema_version"] == 2
    assert data["state"]["player"]["x"] == 10
    assert data["draft_code"] == "print('hello')"
    assert data["updated_at"] is not None


@pytest.mark.asyncio
async def test_demo_progress_put_overwrites_instead_of_duplicating(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="demo1", email="s@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))

    await auth_harness.client.put(
        "/api/demo/progress", headers=bearer("stu1"),
        json={"schema_version": 1, "state": {"monedas": 3}, "draft_code": "uno"},
    )
    await auth_harness.client.put(
        "/api/demo/progress", headers=bearer("stu1"),
        json={"schema_version": 1, "state": {"monedas": 7}, "draft_code": "dos"},
    )

    data = (await auth_harness.client.get("/api/demo/progress", headers=bearer("stu1"))).json()
    assert data["state"] == {"monedas": 7}
    assert data["draft_code"] == "dos"


@pytest.mark.asyncio
async def test_demo_progress_isolation(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="demo1", email="s1@test.com")
    auth_harness.identities["stu2"] = identity(uid="demo2", email="s2@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu2"))

    payload = {"state": {"secret": 42}, "schema_version": 1}
    await auth_harness.client.put("/api/demo/progress", headers=bearer("stu1"), json=payload)

    res_get2 = await auth_harness.client.get("/api/demo/progress", headers=bearer("stu2"))
    assert res_get2.status_code == 200
    assert res_get2.json()["state"] == {}

    # The second student writing must not disturb the first one's row.
    await auth_harness.client.put(
        "/api/demo/progress", headers=bearer("stu2"),
        json={"state": {"secret": 7}, "schema_version": 1},
    )
    assert (await auth_harness.client.get("/api/demo/progress", headers=bearer("stu1"))).json()["state"] == {"secret": 42}


@pytest.mark.asyncio
async def test_demo_progress_requires_authentication(auth_harness):
    assert (await auth_harness.client.get("/api/demo/progress")).status_code == 401
    assert (await auth_harness.client.put("/api/demo/progress", json={"state": {}})).status_code == 401


@pytest.mark.asyncio
async def test_demo_progress_rejects_state_over_the_cap(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="demo1", email="s@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))

    # Over the endpoint's own cap but well under the global request ceiling, so
    # only the per-endpoint check can catch it.
    payload = {"schema_version": 1, "state": {"big": "x" * (MAX_STATE_BYTES + 1024)}}
    res = await auth_harness.client.put("/api/demo/progress", headers=bearer("stu1"), json=payload)
    assert res.status_code == 413
    assert res.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"

    # And the rejected write left nothing behind.
    assert (await auth_harness.client.get("/api/demo/progress", headers=bearer("stu1"))).json()["state"] == {}


@pytest.mark.asyncio
async def test_demo_progress_rejects_draft_code_over_the_cap(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="demo1", email="s@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))

    payload = {"schema_version": 1, "state": {}, "draft_code": "x" * (MAX_DRAFT_CODE_BYTES + 1024)}
    res = await auth_harness.client.put("/api/demo/progress", headers=bearer("stu1"), json=payload)
    assert res.status_code == 413


@pytest.mark.asyncio
async def test_demo_progress_accepts_a_realistic_level(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="demo1", email="s@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))

    # Shaped like what the builder actually posts, so the cap cannot be set so
    # low that ordinary work starts failing.
    level = {
        "ancho": 2200,
        "jugador": {"x": 40, "y": 352},
        "meta": {"x": 2140, "y": 300},
        "plataformas": [{"x": i * 40, "y": 300, "ancho": 92} for i in range(40)],
        "monedas": [{"x": i * 30, "y": 240} for i in range(60)],
        "enemigos": [{"x": i * 100, "y": 354, "vida": 3, "velocidad": 1.4} for i in range(10)],
        "paredes": [{"x": i * 200, "y": 264, "ancho": 32, "alto": 120} for i in range(10)],
        "huecos": [{"x": i * 150, "ancho": 148} for i in range(10)],
    }
    res = await auth_harness.client.put(
        "/api/demo/progress", headers=bearer("stu1"),
        json={"schema_version": 1, "state": level, "draft_code": "// nivel.js\n" * 200},
    )
    assert res.status_code == 200
