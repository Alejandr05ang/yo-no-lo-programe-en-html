# backend — FastAPI + SQLite

Aún sin inicializar. La estructura de carpetas objetivo está en
[`../docs/arquitectura.md`](../docs/arquitectura.md) §4.

## Arranque previsto

```bash
# desde backend/
uv init            # o: python -m venv .venv && pip install ...
uv add fastapi uvicorn sqlalchemy alembic pydantic-settings
# Deno se instala en la imagen Docker; en local: https://deno.com
```

Puntos clave (ver `arquitectura.md`):

- `app/domain/` es **puro** — sin imports de FastAPI ni SQLAlchemy — y lleva el grueso de los tests.
- `app/adapters/ejecutor/base.py` define el puerto `Ejecutor`; `deno.py` lo implementa lanzando
  `deno run --deny-all grader/grader.js` con timeout.
- `grader/` es JS/TS que corre **dentro** de Deno, no Python.
- Los casos de prueba y la evaluación **nunca** se envían al cliente.
