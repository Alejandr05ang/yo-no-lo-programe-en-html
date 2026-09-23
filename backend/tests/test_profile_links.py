"""Contrato de PUT /api/profile con lo que envía "Mis datos".

Bug de clase: un alumno escribía "github.com/ana" y el guardado entero fallaba con un
genérico "revisa el formulario", así que sus redes nunca llegaban a datos.js y el encargo
de redes (E4) seguía diciendo incompleto. El backend sigue exigiendo https público; el
frontend normaliza antes de enviar (frontend/src/lib/enlaces.ts, normalizarUrlDePerfil).
Estos valores son exactamente los que produce esa función (frontend/tests/enlaces.test.ts).
"""

import pytest

from tests.test_auth import bearer, identity


async def alumno(h):
    h.identities["alu"] = identity(uid="links1", email="ana@ejemplo.com")
    r = await h.client.post("/api/auth/bootstrap", headers=bearer("alu"))
    assert r.status_code == 200


def perfil(**cambios):
    base = {
        "full_name": "Ana Rivas",
        "display_name": "Ana",
        "description": "",
        "github_url": None,
        "linkedin_url": None,
        "website_url": None,
        "hobbies": [],
    }
    return {**base, **cambios}


async def test_normalized_links_and_multiline_hobbies_round_trip(auth_harness):
    h = auth_harness
    await alumno(h)
    enviado = perfil(
        # normalizarUrlDePerfil("github.com/ana") y ("www.linkedin.com/in/ana")
        github_url="https://github.com/ana",
        linkedin_url="https://www.linkedin.com/in/ana",
        # textoComoHobbies("Ajedrez\nFútbol\nMúsica")
        hobbies=["Ajedrez", "Fútbol", "Música"],
    )
    r = await h.client.put("/api/profile", headers=bearer("alu"), json=enviado)
    assert r.status_code == 200, r.text

    # Lo que rehidrata el frontend tras guardar (refresh → bootstrap).
    sesion = (await h.client.post("/api/auth/bootstrap", headers=bearer("alu"))).json()["user"]
    assert sesion["github_url"] == "https://github.com/ana"
    assert sesion["linkedin_url"] == "https://www.linkedin.com/in/ana"
    assert sesion["hobbies"] == ["Ajedrez", "Fútbol", "Música"]


@pytest.mark.parametrize(
    "url", ["github.com/ana", "www.linkedin.com/in/ana", "http://github.com/ana"]
)
async def test_raw_links_are_still_rejected_so_the_frontend_must_normalize(auth_harness, url):
    h = auth_harness
    await alumno(h)
    r = await h.client.put("/api/profile", headers=bearer("alu"), json=perfil(github_url=url))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_zero_hobbies_is_valid_and_the_backend_limits_hold(auth_harness):
    h = auth_harness
    await alumno(h)
    ok = await h.client.put("/api/profile", headers=bearer("alu"), json=perfil(hobbies=[]))
    assert ok.status_code == 200
    # Los mismos límites que frontend/src/lib/perfil.ts comprueba campo por campo.
    for hobbies in (["x"] * 21, ["a" * 81]):
        r = await h.client.put("/api/profile", headers=bearer("alu"), json=perfil(hobbies=hobbies))
        assert r.status_code == 422
    justo = await h.client.put(
        "/api/profile", headers=bearer("alu"), json=perfil(hobbies=["a" * 80] * 20)
    )
    assert justo.status_code == 200
