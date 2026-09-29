"""Compile only the additive migration, without settings or a DB connection."""

import importlib.util
import io
import re
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations


def test_publication_migration_is_additive_and_private(monkeypatch):
    path = (
        Path(__file__).resolve().parents[1]
        / "alembic/versions/e6f7a8b9c0d1_add_portfolio_publications.py"
    )
    spec = importlib.util.spec_from_file_location("publication_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    sql = io.StringIO()
    context = MigrationContext.configure(
        dialect_name="postgresql", opts={"as_sql": True, "output_buffer": sql}
    )
    monkeypatch.setattr(migration, "op", Operations(context))
    migration.upgrade()
    compiled = sql.getvalue()
    assert "CREATE TABLE app.portfolio_publications" in compiled
    assert "PRIMARY KEY (user_id)" in compiled
    assert "UNIQUE (slug)" in compiled
    assert "CHECK (visibility = 'cohort')" in compiled
    assert "CHECK (revision >= 1)" in compiled
    assert "ENABLE ROW LEVEL SECURITY" in compiled
    assert "REVOKE ALL ON TABLE app.portfolio_publications FROM PUBLIC" in compiled
    assert "REVOKE ALL ON TABLE app.portfolio_publications FROM anon" in compiled
    assert "REVOKE ALL ON TABLE app.portfolio_publications FROM authenticated" in compiled
    assert "REFERENCES app.users (id) ON DELETE CASCADE" in compiled
    assert "REFERENCES app.cohorts (id) ON DELETE CASCADE" in compiled
    assert not re.search(
        r"(?:^|;)\s*(?:UPDATE|DELETE|INSERT|GRANT|CREATE POLICY)\b", compiled, re.I
    )
