"""QA manual reproducible con SQLite temporal y usuarios ficticios, solo loopback.

Ejecutar desde cualquier directorio con el Python del venv. Nunca lee .env ni
acepta una URL de base externa. No es una ruta ni modo de la aplicación productiva.
"""

import asyncio
import json
import os
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path

import uvicorn
from sqlalchemy import select

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))


async def run():
    with tempfile.TemporaryDirectory(prefix="tutorias-browser-qa-") as directory:
        os.chdir(directory)
        # Evitar también configuración heredada del proceso anfitrión.
        for key in ("DATABASE_URL", "FIREBASE_PROJECT_ID", "GOOGLE_APPLICATION_CREDENTIALS",
                    "SUPABASE_URL", "SUPABASE_SECRET_KEY"):
            os.environ.pop(key, None)
        from app.db.models import CohortMembership, User
        from tests.conftest import auth_harness
        from tests.test_auth import bearer
        from tests.test_workshop_access import activar, preparar

        fixture = auth_harness.__wrapped__(Path(directory))
        harness = await anext(fixture)
        try:
            data = await preparar(harness)
            await activar(harness, data, "V2")
            async with harness.sessions.begin() as session:
                user = await session.scalar(select(User).where(User.id == data["alumno"]))
                user.display_name = "Ana del taller"
                user.full_name = "Ana Ficticia"
                user.description = "Mi web de prueba local, con diseño propio."
                user.hobbies = ["Música", "Lectura", "Programación"]
                user.github_url = "https://github.com/example"
                user.profile_completed_at = datetime.now(UTC)
                other = await session.scalar(select(User).where(User.firebase_uid == "stu2"))
                other.display_name = "Bruno QA B"
                other.full_name = "Bruno Ficticio"
                other.description = "PERFIL PRIVADO B"
                other.hobbies = ["AJEDREZ B", "PINTURA B"]
                other.github_url = "https://github.com/bruno-example"
                other.profile_completed_at = datetime.now(UTC)
                session.add(CohortMembership(cohort_id=data["cohort"], user_id=other.id))
            document = {
                "version": 1,
                "estructura": {"filas": 2, "columnas": 2, "celdas": [
                    {"id": "a", "fila": 0, "columna": 0, "expandeFilas": 1, "expandeColumnas": 1, "seccion": "presentacion"},
                    {"id": "b", "fila": 0, "columna": 1, "expandeFilas": 1, "expandeColumnas": 1, "seccion": "intereses"},
                    {"id": "c", "fila": 1, "columna": 0, "expandeFilas": 1, "expandeColumnas": 2, "seccion": "contacto"},
                ]},
                "secciones": [
                    {"nombre": "presentacion", "contenido": 'cambiarColorFondo("#dae9e4"); mostrar(crearTitulo(datos.nombre)); mostrar(crearParrafo(datos.sobreMi))'},
                    {"nombre": "intereses", "contenido": 'cambiarColorFondo("#f1dcc0"); mostrar(crearSubtitulo("Lo que me gusta")); const lista=crearLista(); mostrar(lista); for(const h of datos.hobbies) agregarA(lista,crearItem(h))'},
                    {"nombre": "contacto", "contenido": 'cambiarColorFondo("#ecdfed"); mostrar(crearEnlace("Mi enlace", "wikipedia.com")); mostrar(crearParrafo("TextoLargo".repeat(40)))'},
                ],
                "main": "mostrar(presentacion); mostrar(intereses); mostrar(contacto)",
            }
            response = await harness.client.put("/api/challenges/e13/progress", headers=bearer("alumno"),
                                                json={"draft_code": json.dumps(document), "status": "in_progress"})
            assert response.status_code == 200
            accepted = await harness.client.put(
                "/api/challenges/e1/progress", headers=bearer("alumno"),
                json={"draft_code": 'mostrar(crearTitulo(datos.nombre))', "status": "accepted",
                      "cases_passed": 1, "cases_total": 1},
            )
            assert accepted.status_code == 200
            config = uvicorn.Config(harness.app, host="127.0.0.1", port=8765, log_level="warning")
            print("QA API local: http://127.0.0.1:8765 (SQLite temporal; token ficticio alumno)", flush=True)
            await uvicorn.Server(config).serve()
        finally:
            await fixture.aclose()


if __name__ == "__main__":
    asyncio.run(run())
