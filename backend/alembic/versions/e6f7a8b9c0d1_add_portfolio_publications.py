"""Cohort-only static portfolio snapshots, independent of saved exercise source.

Additive preparation only. No existing rows, flags, memberships or progress change.
No RLS policy grants browser clients access: FastAPI remains the authority.

Revision ID: e6f7a8b9c0d1
Revises: d4e8a1c3b5f7
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: str | Sequence[str] | None = "d4e8a1c3b5f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "portfolio_publications",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("cohort_id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("snapshot_html", sa.Text(), nullable=False),
        sa.Column("visibility", sa.Text(), server_default=sa.text("'cohort'"), nullable=False),
        sa.Column("source_challenge_key", sa.Text(), nullable=False),
        sa.Column("source_fingerprint", sa.Text(), nullable=False),
        sa.Column("revision", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "published_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("user_id"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["app.users.id"],
            name="portfolio_publications_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["cohort_id"],
            ["app.cohorts.id"],
            name="portfolio_publications_cohort_id_fkey",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("slug", name="portfolio_publications_slug_key"),
        sa.CheckConstraint("visibility = 'cohort'", name="portfolio_publications_visibility_check"),
        sa.CheckConstraint("revision >= 1", name="portfolio_publications_revision_check"),
        schema="app",
    )
    op.create_index(
        "portfolio_publications_cohort_published_idx",
        "portfolio_publications",
        ["cohort_id", "is_published"],
        schema="app",
    )
    op.execute("ALTER TABLE app.portfolio_publications ENABLE ROW LEVEL SECURITY")
    # Do not inherit browser grants from installation-specific default privileges.
    # Supabase roles may not exist in a standalone PostgreSQL test environment.
    op.execute("REVOKE ALL ON TABLE app.portfolio_publications FROM PUBLIC")
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON TABLE app.portfolio_publications FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON TABLE app.portfolio_publications FROM authenticated;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index(
        "portfolio_publications_cohort_published_idx", "portfolio_publications", schema="app"
    )
    op.drop_table("portfolio_publications", schema="app")
