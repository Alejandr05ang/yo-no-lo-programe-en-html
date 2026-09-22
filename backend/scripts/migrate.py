"""Aplica las migraciones pendientes contra la base configurada.

Deliberadamente NO va en el arranque del contenedor: Cloud Run levanta varias
instancias a la vez y todas correrian la migracion en paralelo. Este script se
ejecuta una vez, a mano, antes de desplegar el backend.

    cd backend
    .venv/Scripts/python.exe scripts/migrate.py           # aplica hasta head
    .venv/Scripts/python.exe scripts/migrate.py --estado  # solo informa, no escribe

La conexion la resuelve alembic/env.py a partir de backend/.env, igual que la
aplicacion. Este script no lee ni imprime credenciales.
"""

from __future__ import annotations

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from alembic.config import Config  # noqa: E402

from alembic import command  # noqa: E402


def configurar() -> Config:
    config = Config(str(RAIZ / "alembic.ini"))
    config.set_main_option("script_location", str(RAIZ / "alembic"))
    return config


def main() -> None:
    config = configurar()
    if "--estado" in sys.argv:
        print("Revision aplicada en la base:")
        command.current(config, verbose=True)
        return
    print("Aplicando migraciones hasta head...")
    command.upgrade(config, "head")
    print("MIGRACIONES=OK")


if __name__ == "__main__":
    main()
