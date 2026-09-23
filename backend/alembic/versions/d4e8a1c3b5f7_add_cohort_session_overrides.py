"""Add cohort_session_overrides

El docente necesita pausar un dia concreto sin mover el dia actual del curso: por
ejemplo cerrar el Dia 2 mientras el Dia 3 sigue abierto. challenge_overrides no
sirve para eso, porque trabaja reto a reto y un dia sin retos (L1) no tendria
nada que cerrar.

Aditiva y reversible: tabla nueva, ninguna fila existente cambia. Sin filas, el
acceso es exactamente el de antes (acumulativo hasta el dia actual). RLS activado
como en el resto del esquema app: la tabla solo la lee y escribe el backend.

Revision ID: d4e8a1c3b5f7
Revises: c1a4f2b9e70d
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = 'd4e8a1c3b5f7'
down_revision: str | Sequence[str] | None = 'c1a4f2b9e70d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'cohort_session_overrides',
        sa.Column('cohort_id', sa.Uuid(), nullable=False),
        sa.Column('session_id', sa.Uuid(), nullable=False),
        sa.Column('is_closed', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('updated_by', sa.Uuid(), nullable=True),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ['cohort_id'], ['app.cohorts.id'],
            name='cohort_session_overrides_cohort_id_fkey', ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['session_id'], ['app.sessions_catalog.id'],
            name='cohort_session_overrides_session_id_fkey', ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['updated_by'], ['app.users.id'],
            name='cohort_session_overrides_updated_by_fkey', ondelete='SET NULL',
        ),
        sa.PrimaryKeyConstraint('cohort_id', 'session_id'),
        schema='app',
    )
    op.create_index(
        'cohort_session_overrides_session_idx', 'cohort_session_overrides', ['session_id'],
        schema='app',
    )
    op.create_index(
        'cohort_session_overrides_updated_by_idx', 'cohort_session_overrides', ['updated_by'],
        schema='app',
    )
    op.execute("ALTER TABLE app.cohort_session_overrides ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    op.drop_index('cohort_session_overrides_updated_by_idx', 'cohort_session_overrides', schema='app')
    op.drop_index('cohort_session_overrides_session_idx', 'cohort_session_overrides', schema='app')
    op.drop_table('cohort_session_overrides', schema='app')
