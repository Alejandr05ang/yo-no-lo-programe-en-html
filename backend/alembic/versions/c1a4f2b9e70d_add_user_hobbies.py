"""Add users.hobbies

El portafolio del alumno recorre una lista de aficiones (encargo e5/e6) que hasta
ahora solo vivia en localStorage, asi que se perdia al cambiar de navegador y no
era la misma en dos equipos. Es el ultimo campo del perfil sin sitio en Postgres.

Aditiva y reversible: columna nueva con server_default '[]', ninguna fila existente
cambia de contenido.

Revision ID: c1a4f2b9e70d
Revises: b7e5c70a2d97
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = 'c1a4f2b9e70d'
down_revision: str | Sequence[str] | None = 'b7e5c70a2d97'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'hobbies',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        schema='app',
    )


def downgrade() -> None:
    op.drop_column('users', 'hobbies', schema='app')
