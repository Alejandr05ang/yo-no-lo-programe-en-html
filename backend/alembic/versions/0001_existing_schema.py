"""Marker for the pre-existing app schema inspected on 2026-09-20.

This revision deliberately creates no application table, enum, policy or data.
It cannot provision an empty database. See backend/README.md before stamping.
"""

revision = "0001_existing_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    # No DROP and no role/policy change: the schema predates this migration history.
    pass
