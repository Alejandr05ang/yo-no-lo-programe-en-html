
import pytest

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
    
    res_get = await auth_harness.client.get("/api/demo/progress", headers=bearer("stu1"))
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["schema_version"] == 2
    assert data["state"]["player"]["x"] == 10
    assert data["draft_code"] == "print('hello')"

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
@pytest.mark.asyncio
async def test_demo_progress_large_payload_rejected(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="demo1", email="s@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))
    
    # Payload over 512KB which is likely the limit
    large_str = "x" * (1024 * 1024)
    payload = {
        "schema_version": 1,
        "state": {"big": large_str}
    }
    res = await auth_harness.client.put("/api/demo/progress", headers=bearer("stu1"), json=payload)
    assert res.status_code == 413