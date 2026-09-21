import pytest

from tests.test_auth import bearer, identity


@pytest.mark.asyncio
async def test_profile_update_own(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="prof1", email="p1@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))
    
    payload = {
        "full_name": "Test User",
        "display_name": "Test",
        "description": "Dev",
        "website_url": None,
        "github_url": None,
        "linkedin_url": None
    }
    res = await auth_harness.client.put("/api/profile", headers=bearer("stu1"), json=payload)
    assert res.status_code == 200
    assert res.json()["user"]["full_name"] == "Test User"
    
    res_get = await auth_harness.client.get("/api/me", headers=bearer("stu1"))
    assert res_get.status_code == 200
    assert res_get.json()["user"]["full_name"] == "Test User"

@pytest.mark.asyncio
async def test_profile_update_others_not_allowed(auth_harness):
    auth_harness.identities["stu1"] = identity(uid="prof1", email="p1@test.com")
    auth_harness.identities["stu2"] = identity(uid="prof2", email="p2@test.com")
    await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu1"))
    res2 = await auth_harness.client.post("/api/auth/bootstrap", headers=bearer("stu2"))
    
    user2_id = res2.json()["user"]["id"]
    
    # Try to PUT to another user's profile.
    # The API doesn't even expose a way to update another user's profile directly (it uses CurrentUser).
    # If there's no endpoint for it, this requirement is trivially satisfied by design.
    # Let's ensure there is no route like PUT /api/profile/{user_id}
    res = await auth_harness.client.put(f"/api/profile/{user2_id}", headers=bearer("stu1"), json={"full_name": "Hacked"})
    assert res.status_code in (404, 405)