"""Acceso acumulativo a los dias del taller y pausa manual por el docente.

Usa el catalogo real (seed_catalog): L1, Ma1, Mi1, Ju1... con e1-e3 en Ma1,
e4-e6 en Mi1 y L1 sin retos. Asi los codigos y el orden son los de produccion.
"""

from uuid import UUID

import pytest
from sqlalchemy import select

from app.catalog.seed import seed_catalog
from app.db.models import (
    AdminAllowlist,
    AuditLog,
    Challenge,
    ChallengeOverride,
    Cohort,
    CohortMembership,
    CohortState,
    Progress,
    SessionCatalog,
    User,
)
from tests.test_auth import bearer, identity


async def preparar(h):
    """Catalogo real, una cohorte, un admin, un alumno matriculado y un instructor."""
    h.identities["admin"] = identity(uid="adm", email="admin@example.com")
    h.identities["alumno"] = identity(uid="stu", email="alumno@example.com")
    h.identities["otro"] = identity(uid="stu2", email="otro@example.com")
    h.identities["instructor"] = identity(uid="ins", email="inst@example.com")
    async with h.sessions.begin() as s:
        s.add(AdminAllowlist(email="admin@example.com", active=True))
        await seed_catalog(s)
    for quien in ("admin", "alumno", "otro", "instructor"):
        r = await h.client.post("/api/auth/bootstrap", headers=bearer(quien))
        assert r.status_code == 200, r.text
    async with h.sessions.begin() as s:
        cohorte = Cohort(name="Clase", slug="clase", join_code_hash="x", is_active=True)
        s.add(cohorte)
        await s.flush()
        s.add(CohortState(cohort_id=cohorte.id))
        alumno = await s.scalar(select(User).where(User.email == "alumno@example.com"))
        instructor = await s.scalar(select(User).where(User.email == "inst@example.com"))
        instructor.role = "instructor"
        s.add(CohortMembership(cohort_id=cohorte.id, user_id=alumno.id, status="active"))
        s.add(
            CohortMembership(
                cohort_id=cohorte.id, user_id=instructor.id, role="instructor", status="active"
            )
        )
        sesiones = {x.code: x.id for x in (await s.scalars(select(SessionCatalog))).all()}
        retos = {x.key: x.id for x in (await s.scalars(select(Challenge))).all()}
        return {
            "cohort": cohorte.id,
            "alumno": alumno.id,
            "sesiones": sesiones,
            "retos": retos,
        }


async def activar(h, d, codigo, quien="admin"):
    r = await h.client.patch(
        f"/api/admin/cohorts/{d['cohort']}/active-session",
        json={"active_session_id": str(d["sesiones"][codigo]) if codigo else None},
        headers=bearer(quien),
    )
    assert r.status_code == 200, r.text
    return r.json()


async def pausar(h, d, codigo, paused=True, quien="admin"):
    return await h.client.put(
        f"/api/admin/cohorts/{d['cohort']}/sessions/{d['sesiones'][codigo]}/access",
        json={"paused": paused},
        headers=bearer(quien),
    )


async def dia(h, codigo, quien="alumno"):
    return await h.client.get(f"/api/map/sessions/{codigo}", headers=bearer(quien))


async def reto(h, key, quien="alumno"):
    return await h.client.get(f"/api/challenges/{key}/progress", headers=bearer(quien))


def codigo_error(r):
    return r.json()["error"]["code"]


async def mapa(h, quien="alumno"):
    r = await h.client.get("/api/map", headers=bearer(quien))
    assert r.status_code == 200, r.text
    return {x["code"]: x for x in r.json()["sessions"]}


# --- Regla base: el dia actual es el maximo desbloqueado -------------------


@pytest.mark.parametrize(
    "activo,abiertos,bloqueado",
    [
        ("L1", ["L1"], "Ma1"),
        ("Ma1", ["L1", "Ma1"], "Mi1"),
        ("Mi1", ["L1", "Ma1", "Mi1"], "Ju1"),
    ],
)
async def test_days_accumulate_up_to_the_current_one(auth_harness, activo, abiertos, bloqueado):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, activo)

    for codigo in abiertos:
        assert (await dia(h, codigo)).status_code == 200, codigo
    r = await dia(h, bloqueado)
    assert r.status_code == 403
    assert codigo_error(r) == "SESSION_LOCKED"


@pytest.mark.parametrize(
    "activo,abiertos,bloqueado",
    [
        ("Ma1", ["e1", "e2", "e3"], "e4"),
        ("Mi1", ["e1", "e3", "e4", "e6"], "e7"),
    ],
)
async def test_challenges_follow_the_same_cumulative_rule(
    auth_harness, activo, abiertos, bloqueado
):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, activo)

    for key in abiertos:
        assert (await reto(h, key)).status_code == 200, key
    r = await reto(h, bloqueado)
    assert r.status_code == 403
    assert codigo_error(r) == "CHALLENGE_LOCKED"


async def test_without_a_current_day_nothing_is_open(auth_harness):
    h = auth_harness
    await preparar(h)
    r = await dia(h, "L1")
    assert r.status_code == 403
    assert codigo_error(r) == "SESSION_LOCKED"
    sesiones = await mapa(h)
    assert all(x["access"] == "locked" for x in sesiones.values())
    assert not any(x["is_current"] for x in sesiones.values())


async def test_a_day_without_challenges_opens_with_an_empty_list(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "L1")
    r = await dia(h, "L1")
    assert r.status_code == 200
    assert r.json()["challenges"] == []
    assert r.json()["progress"] == {"required_total": 0, "accepted": 0, "started": 0}
    assert r.json()["is_current"] is True


async def test_map_reports_access_and_current_day(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    m = await mapa(h)
    assert [m[c]["access"] for c in ("L1", "Ma1", "Mi1", "Ju1")] == [
        "open", "open", "open", "locked",
    ]
    assert [c for c, x in m.items() if x["is_current"]] == ["Mi1"]
    # El campo antiguo sigue igual para clientes que todavia no leen access.
    assert [m[c]["state"] for c in ("Ma1", "Mi1", "Ju1")] == ["done", "active", "future"]


# --- Pausa manual del docente ------------------------------------------------


async def test_pausing_a_past_day_closes_only_that_day(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")

    r = await pausar(h, d, "Ma1")
    assert r.status_code == 200, r.text
    assert [p["code"] for p in r.json()["paused_sessions"]] == ["Ma1"]
    # El dia actual no se mueve por pausar otro.
    assert r.json()["active_session_code"] == "Mi1"

    assert (await dia(h, "L1")).status_code == 200
    r = await dia(h, "Ma1")
    assert r.status_code == 403
    assert codigo_error(r) == "SESSION_PAUSED"
    assert (await dia(h, "Mi1")).status_code == 200

    m = await mapa(h)
    assert m["Ma1"]["access"] == "paused"
    assert all(c["unlocked"] is False for c in m["Ma1"]["challenges"])


async def test_a_paused_day_blocks_its_challenges_for_reading_and_writing(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    await pausar(h, d, "Ma1")

    r = await reto(h, "e1")
    assert r.status_code == 403
    assert codigo_error(r) == "SESSION_PAUSED"
    r = await h.client.put(
        "/api/challenges/e1/progress", json={"draft_code": "x"}, headers=bearer("alumno")
    )
    assert r.status_code == 403
    assert codigo_error(r) == "SESSION_PAUSED"
    r = await h.client.post(
        "/api/challenges/e1/submit", json={"code_submitted": "x"}, headers=bearer("alumno")
    )
    assert r.status_code == 403
    # Los retos de otros dias siguen funcionando.
    assert (await reto(h, "e4")).status_code == 200


async def test_pause_and_reopen_preserve_progress_exactly(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")

    guardar = await h.client.put(
        "/api/challenges/e2/progress",
        json={"draft_code": 'mostrar(crearParrafo("Sobre mí: ñandú"))', "status": "in_progress"},
        headers=bearer("alumno"),
    )
    assert guardar.status_code == 200
    aceptar = await h.client.put(
        "/api/challenges/e1/progress",
        json={
            "draft_code": 'mostrar(crearTitulo("Ana"))',
            "status": "accepted",
            "cases_passed": 3,
            "cases_total": 3,
        },
        headers=bearer("alumno"),
    )
    assert aceptar.status_code == 200

    async with h.sessions() as s:
        antes = {
            p.challenge_id: (p.status, p.draft_code, p.cases_passed, p.accepted_at)
            for p in (await s.scalars(select(Progress))).all()
        }

    await pausar(h, d, "Ma1")
    await pausar(h, d, "Ma1", paused=False)

    async with h.sessions() as s:
        despues = {
            p.challenge_id: (p.status, p.draft_code, p.cases_passed, p.accepted_at)
            for p in (await s.scalars(select(Progress))).all()
        }
    assert despues == antes

    assert (await dia(h, "Ma1")).status_code == 200
    r = await reto(h, "e2")
    assert r.json()["draft_code"] == 'mostrar(crearParrafo("Sobre mí: ñandú"))'
    assert (await reto(h, "e1")).json()["status"] == "accepted"


async def test_reopening_never_opens_a_future_day(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Ma1")

    # No se puede pausar un dia al que el curso no ha llegado.
    r = await pausar(h, d, "Mi1")
    assert r.status_code == 409
    assert codigo_error(r) == "SESSION_NOT_OPEN"

    # "Reabrir" algo que nunca se pauso no lo abre: el futuro sigue mandando.
    r = await pausar(h, d, "Mi1", paused=False)
    assert r.status_code == 200
    r = await dia(h, "Mi1")
    assert r.status_code == 403
    assert codigo_error(r) == "SESSION_LOCKED"


async def test_a_pause_survives_moving_the_current_day_back_and_forth(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    await pausar(h, d, "Ma1")

    # Retroceder el curso: Ma1 queda por delante, bloqueado por la regla base, y
    # la pausa sigue registrada para que el admin la vea y pueda quitarla.
    estado = await activar(h, d, "L1")
    assert [p["code"] for p in estado["paused_sessions"]] == ["Ma1"]
    r = await dia(h, "Ma1")
    assert codigo_error(r) == "SESSION_LOCKED"

    # Volver a avanzar no la borra: reabrir es siempre una decision explicita.
    await activar(h, d, "Mi1")
    assert codigo_error(await dia(h, "Ma1")) == "SESSION_PAUSED"
    await pausar(h, d, "Ma1", paused=False)
    assert (await dia(h, "Ma1")).status_code == 200


async def test_the_current_day_can_be_paused_and_activating_it_reopens_it(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    assert (await pausar(h, d, "Mi1")).status_code == 200
    assert codigo_error(await dia(h, "Mi1")) == "SESSION_PAUSED"
    # Los dias anteriores no se ven afectados.
    assert (await dia(h, "Ma1")).status_code == 200

    estado = await activar(h, d, "Mi1")
    assert estado["paused_sessions"] == []
    assert (await dia(h, "Mi1")).status_code == 200

    async with h.sessions() as s:
        reapertura = await s.scalar(
            select(AuditLog).where(AuditLog.action == "REOPEN_SESSION")
        )
    assert reapertura.after_state["reason"] == "activated"


async def test_pause_and_reopen_are_audited_once_and_idempotent(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")

    await pausar(h, d, "Ma1")
    await pausar(h, d, "Ma1")  # repetir no duplica
    await pausar(h, d, "Ma1", paused=False)
    await pausar(h, d, "Ma1", paused=False)

    async with h.sessions() as s:
        filas = (
            await s.scalars(
                select(AuditLog)
                .where(AuditLog.entity_type == "cohort_session")
                .order_by(AuditLog.id)
            )
        ).all()
        admin = await s.scalar(select(User).where(User.email == "admin@example.com"))
    assert [f.action for f in filas] == ["PAUSE_SESSION", "REOPEN_SESSION"]
    assert all(f.actor_user_id == admin.id for f in filas)
    assert filas[0].entity_id == f"{d['cohort']}:{d['sesiones']['Ma1']}"
    assert filas[0].before_state == {"paused": False, "session_code": "Ma1"}
    assert filas[0].after_state == {"paused": True, "session_code": "Ma1"}


# --- Jerarquia con los overrides de reto --------------------------------------


async def test_a_paused_day_wins_over_a_challenge_override(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    async with h.sessions.begin() as s:
        s.add(ChallengeOverride(cohort_id=d["cohort"], challenge_id=d["retos"]["e1"], unlocked=True))
    await pausar(h, d, "Ma1")
    assert codigo_error(await reto(h, "e1")) == "SESSION_PAUSED"
    # El mapa tiene que decir lo mismo que la API: ni un enlace abierto a ese reto.
    m = await mapa(h)
    assert {c["key"]: c["unlocked"] for c in m["Ma1"]["challenges"]} == {
        "e1": False, "e2": False, "e3": False,
    }


async def test_on_an_open_day_a_challenge_override_still_rules_its_challenge(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    async with h.sessions.begin() as s:
        s.add(
            ChallengeOverride(cohort_id=d["cohort"], challenge_id=d["retos"]["e5"], unlocked=False)
        )
    assert codigo_error(await reto(h, "e5")) == "CHALLENGE_LOCKED"
    assert (await reto(h, "e4")).status_code == 200

    detalle = (await dia(h, "Mi1")).json()
    estados = {c["key"]: c["unlocked"] for c in detalle["challenges"]}
    assert estados == {"e4": True, "e5": False, "e6": True}


async def test_a_challenge_override_on_a_future_day_returns_locked(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Ma1")
    async with h.sessions.begin() as s:
        s.add(
            ChallengeOverride(cohort_id=d["cohort"], challenge_id=d["retos"]["e4"], unlocked=True)
        )
    r = await reto(h, "e4")
    assert r.status_code == 403
    assert codigo_error(r) == "CHALLENGE_LOCKED"


async def test_instructor_activating_a_paused_day_reopens_it(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    await pausar(h, d, "Ma1")

    r = await h.client.patch(
        f"/api/instructor/cohorts/{d['cohort']}/active-session",
        json={"active_session_id": str(d["sesiones"]["Ma1"])},
        headers=bearer("instructor"),
    )
    assert r.status_code == 200, r.text

    # Debe estar reabierto para el alumno
    r_alumno = await dia(h, "Ma1")
    assert r_alumno.status_code == 200


# --- Permisos ------------------------------------------------------------------


@pytest.mark.parametrize("quien", ["alumno", "instructor"])
async def test_only_admins_can_pause_a_day(auth_harness, quien):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    r = await pausar(h, d, "Ma1", quien=quien)
    assert r.status_code == 403
    assert codigo_error(r) == "FORBIDDEN"
    assert (await dia(h, "Ma1")).status_code == 200


async def test_admin_previews_any_day_even_future_or_paused(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Ma1")
    await pausar(h, d, "Ma1")
    for codigo in ("Ma1", "V2"):
        r = await dia(h, codigo, quien="admin")
        assert r.status_code == 200
        assert r.json()["preview"] is True


async def test_instructor_changing_the_current_day_is_audited(auth_harness):
    h = auth_harness
    d = await preparar(h)
    r = await h.client.patch(
        f"/api/instructor/cohorts/{d['cohort']}/active-session",
        json={"active_session_id": str(d["sesiones"]["Ma1"])},
        headers=bearer("instructor"),
    )
    assert r.status_code == 200, r.text
    async with h.sessions() as s:
        fila = await s.scalar(select(AuditLog).where(AuditLog.action == "ADVANCE_SESSION"))
    assert fila is not None
    assert fila.after_state == {"active_session_id": str(d["sesiones"]["Ma1"])}


# --- Progreso real en el mapa -------------------------------------------------


async def test_map_counts_real_progress_per_day(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Mi1")
    await h.client.put(
        "/api/challenges/e1/progress",
        json={"draft_code": "a", "status": "accepted", "cases_passed": 3, "cases_total": 3},
        headers=bearer("alumno"),
    )
    await h.client.put(
        "/api/challenges/e2/progress",
        json={"draft_code": "b", "status": "in_progress"},
        headers=bearer("alumno"),
    )
    m = await mapa(h)
    assert m["Ma1"]["progress"] == {"required_total": 3, "accepted": 1, "started": 1}
    estados = {c["key"]: c["progress_status"] for c in m["Ma1"]["challenges"]}
    assert estados == {"e1": "accepted", "e2": "in_progress", "e3": "not_started"}
    assert m["Mi1"]["progress"] == {"required_total": 3, "accepted": 0, "started": 0}

    # El progreso es de cada alumno: otro alumno de la misma clase no lo ve.
    async with h.sessions.begin() as s:
        otro = await s.scalar(select(User).where(User.email == "otro@example.com"))
        s.add(CohortMembership(cohort_id=d["cohort"], user_id=otro.id, status="active"))
    m2 = await mapa(h, quien="otro")
    assert m2["Ma1"]["progress"] == {"required_total": 3, "accepted": 0, "started": 0}


async def test_accepted_is_never_downgraded_by_autosave(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Ma1")
    await h.client.put(
        "/api/challenges/e1/progress",
        json={"draft_code": "v1", "status": "accepted", "cases_passed": 3, "cases_total": 3},
        headers=bearer("alumno"),
    )
    r = await h.client.put(
        "/api/challenges/e1/progress",
        json={"draft_code": "v2", "status": "in_progress"},
        headers=bearer("alumno"),
    )
    assert r.json()["status"] == "accepted"
    assert r.json()["draft_code"] == "v2"
    assert r.json()["accepted_at"] is not None


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"status": "accepted"},
        {"status": "accepted", "cases_passed": 2, "cases_total": 3},
        {"status": "accepted", "cases_passed": 0, "cases_total": 0},
        {"status": "not_started"},
        {"status": "hecho"},
    ],
)
async def test_progress_rejects_invalid_status_writes(auth_harness, cuerpo):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Ma1")
    r = await h.client.put("/api/challenges/e1/progress", json=cuerpo, headers=bearer("alumno"))
    assert r.status_code == 422
    assert codigo_error(r) == "VALIDATION_ERROR"


async def test_accepting_on_first_save_records_when(auth_harness):
    h = auth_harness
    d = await preparar(h)
    await activar(h, d, "Ma1")
    r = await h.client.put(
        "/api/challenges/e3/progress",
        json={"draft_code": "x", "status": "accepted", "cases_passed": 3, "cases_total": 3},
        headers=bearer("alumno"),
    )
    assert r.json()["status"] == "accepted"
    assert r.json()["accepted_at"] is not None
    async with h.sessions() as s:
        fila = await s.scalar(
            select(Progress).where(Progress.challenge_id == d["retos"]["e3"])
        )
    assert fila.accepted_at is not None
    assert isinstance(d["cohort"], UUID)
