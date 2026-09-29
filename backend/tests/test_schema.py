import json
from pathlib import Path

from sqlalchemy import CheckConstraint
from sqlalchemy.dialects.postgresql import dialect
from sqlalchemy.schema import CreateTable

from app.db.models import Base


def test_model_checks_match_the_live_database_snapshot():
    snapshot_path = Path(__file__).resolve().parents[2] / "docs/SUPABASE-CONSTRAINTS.json"
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8-sig"))
    expected = {
        (row["table_name"], row["conname"]): row["definition"].removeprefix("CHECK (")[:-1]
        for row in snapshot
        if row["contype"] == "c"
    }
    actual = {
        (table.fullname, constraint.name): str(constraint.sqltext)
        for table in Base.metadata.tables.values()
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
    }
    # Historical production snapshot stays exact for the already deployed schema.
    # Additive publication migration is local only; do not edit that snapshot.
    assert {key: value for key, value in actual.items() if key[0] != "app.portfolio_publications"} == expected
    assert {key: value for key, value in actual.items() if key[0] == "app.portfolio_publications"} == {
        ("app.portfolio_publications", "portfolio_publications_visibility_check"): "visibility = 'cohort'",
        ("app.portfolio_publications", "portfolio_publications_revision_check"): "revision >= 1",
    }
    # Compile the mappings using the PostgreSQL dialect without opening a connection.
    for table in Base.metadata.sorted_tables:
        assert str(CreateTable(table).compile(dialect=dialect()))
