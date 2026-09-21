"""Static mapping of the inspected app schema. No runtime schema creation.

Snapshot: docs/SUPABASE-{SCHEMA,INDEXES,CONSTRAINTS}.json, 2026-09-20.
Existing PostgreSQL enums are referenced with create_type=False.
"""

from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    metadata = MetaData(schema="app")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("firebase_uid", name="users_firebase_uid_key"),
        Index("users_email_lower_uidx", text("lower(email)"), unique=True),
    )
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    firebase_uid: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text)
    full_name: Mapped[str] = mapped_column(Text, server_default=text("''"))
    display_name: Mapped[str] = mapped_column(Text, server_default=text("''"))
    description: Mapped[str] = mapped_column(Text, server_default=text("''"))
    avatar_path: Mapped[str | None] = mapped_column(Text)
    github_url: Mapped[str | None] = mapped_column(Text)
    linkedin_url: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(Text)
    role: Mapped[str] = mapped_column(
        ENUM("student", "instructor", "admin", name="system_role", schema="app", create_type=False),
        server_default=text("'student'"),
    )
    email_verified: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    profile_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AdminAllowlist(Base):
    __tablename__ = "admin_allowlist"
    __table_args__ = (Index("admin_allowlist_added_by_idx", "added_by"),)
    email: Mapped[str] = mapped_column(Text, primary_key=True)
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    added_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("app.users.id", ondelete="SET NULL", name="admin_allowlist_added_by_fkey")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Cohort(Base):
    __tablename__ = "cohorts"
    __table_args__ = (
        CheckConstraint(
            "(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)", name="cohorts_slug_format"
        ).ddl_if(dialect="postgresql"),
        UniqueConstraint("slug", name="cohorts_slug_key"),
        Index("cohorts_created_by_idx", "created_by"),
    )
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(Text)
    join_code_hash: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, server_default=text("''"))
    starts_on: Mapped[date | None] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("app.users.id", ondelete="SET NULL", name="cohorts_created_by_fkey")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CohortMembership(Base):
    __tablename__ = "cohort_memberships"
    __table_args__ = (Index("cohort_memberships_user_idx", "user_id"),)
    cohort_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.cohorts.id", ondelete="CASCADE", name="cohort_memberships_cohort_id_fkey"),
        primary_key=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.users.id", ondelete="CASCADE", name="cohort_memberships_user_id_fkey"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(
        ENUM("student", "instructor", name="membership_role", schema="app", create_type=False),
        server_default=text("'student'"),
    )
    status: Mapped[str] = mapped_column(
        ENUM(
            "pending",
            "active",
            "removed",
            name="membership_status",
            schema="app",
            create_type=False,
        ),
        server_default=text("'active'"),
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SessionCatalog(Base):
    __tablename__ = "sessions_catalog"
    __table_args__ = (
        UniqueConstraint("code", name="sessions_catalog_code_key"),
        CheckConstraint("(day_number >= 1)", name="sessions_catalog_day_number_check").ddl_if(
            dialect="postgresql"
        ),
        CheckConstraint("(order_index >= 1)", name="sessions_catalog_order_index_check").ddl_if(
            dialect="postgresql"
        ),
        UniqueConstraint("order_index", name="sessions_catalog_order_index_key"),
    )
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    code: Mapped[str] = mapped_column(Text)
    day_number: Mapped[int] = mapped_column(Integer)
    order_index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(Text)
    teaser_summary: Mapped[str] = mapped_column(Text, server_default=text("''"))
    description: Mapped[str] = mapped_column(Text, server_default=text("''"))
    is_published: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Challenge(Base):
    __tablename__ = "challenges"
    __table_args__ = (
        UniqueConstraint("key", name="challenges_key_key"),
        Index("challenges_created_by_idx", "created_by"),
        Index("challenges_session_sort_idx", "session_id", "sort_order"),
    )
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    session_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey(
            "app.sessions_catalog.id", ondelete="CASCADE", name="challenges_session_id_fkey"
        ),
    )
    key: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    teaser_summary: Mapped[str] = mapped_column(Text, server_default=text("''"))
    instructions: Mapped[str] = mapped_column(Text, server_default=text("''"))
    kind: Mapped[str] = mapped_column(
        ENUM("core", "platinum", "manual", name="challenge_kind", schema="app", create_type=False),
        server_default=text("'core'"),
    )
    status: Mapped[str] = mapped_column(
        ENUM(
            "draft",
            "published",
            "disabled",
            name="challenge_status",
            schema="app",
            create_type=False,
        ),
        server_default=text("'draft'"),
    )
    sort_order: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    preview_visible: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    requires_submission: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("app.users.id", ondelete="SET NULL", name="challenges_created_by_fkey")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CohortState(Base):
    __tablename__ = "cohort_state"
    __table_args__ = (
        Index("cohort_state_active_session_idx", "active_session_id"),
        Index("cohort_state_updated_by_idx", "updated_by"),
    )
    cohort_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.cohorts.id", ondelete="CASCADE", name="cohort_state_cohort_id_fkey"),
        primary_key=True,
    )
    active_session_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey(
            "app.sessions_catalog.id",
            ondelete="SET NULL",
            name="cohort_state_active_session_id_fkey",
        ),
    )
    updated_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("app.users.id", ondelete="SET NULL", name="cohort_state_updated_by_fkey")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ChallengeOverride(Base):
    __tablename__ = "challenge_overrides"
    __table_args__ = (
        Index("challenge_overrides_challenge_idx", "challenge_id"),
        Index("challenge_overrides_updated_by_idx", "updated_by"),
    )
    cohort_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.cohorts.id", ondelete="CASCADE", name="challenge_overrides_cohort_id_fkey"),
        primary_key=True,
    )
    challenge_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey(
            "app.challenges.id", ondelete="CASCADE", name="challenge_overrides_challenge_id_fkey"
        ),
        primary_key=True,
    )
    preview_visible: Mapped[bool | None] = mapped_column(Boolean)
    unlocked: Mapped[bool | None] = mapped_column(Boolean)
    updated_by: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("app.users.id", ondelete="SET NULL", name="challenge_overrides_updated_by_fkey"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (
        CheckConstraint("(attempts_count >= 0)", name="progress_attempts_count_check").ddl_if(
            dialect="postgresql"
        ),
        CheckConstraint("(cases_passed >= 0)", name="progress_cases_passed_check").ddl_if(
            dialect="postgresql"
        ),
        CheckConstraint("(cases_total >= 0)", name="progress_cases_total_check").ddl_if(
            dialect="postgresql"
        ),
        Index("progress_challenge_idx", "challenge_id"),
        Index("progress_cohort_status_idx", "cohort_id", "status"),
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.users.id", ondelete="CASCADE", name="progress_user_id_fkey"),
        primary_key=True,
    )
    cohort_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.cohorts.id", ondelete="CASCADE", name="progress_cohort_id_fkey"),
        primary_key=True,
    )
    challenge_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.challenges.id", ondelete="CASCADE", name="progress_challenge_id_fkey"),
        primary_key=True,
    )
    status: Mapped[str] = mapped_column(
        ENUM(
            "not_started",
            "draft",
            "in_progress",
            "accepted",
            name="progress_status",
            schema="app",
            create_type=False,
        ),
        server_default=text("'not_started'"),
    )
    draft_code: Mapped[str] = mapped_column(Text, server_default=text("''"))
    attempts_count: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    cases_passed: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    cases_total: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    last_saved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        CheckConstraint("(attempt_number >= 1)", name="submissions_attempt_number_check").ddl_if(
            dialect="postgresql"
        ),
        CheckConstraint(
            "((grader_duration_ms IS NULL) OR (grader_duration_ms >= 0))",
            name="submissions_grader_duration_ms_check",
        ).ddl_if(dialect="postgresql"),
        UniqueConstraint(
            "user_id",
            "cohort_id",
            "challenge_id",
            "attempt_number",
            name="submissions_user_id_cohort_id_challenge_id_attempt_number_key",
        ),
        Index("submissions_challenge_idx", "challenge_id"),
        Index("submissions_cohort_created_idx", "cohort_id", text("created_at DESC")),
        Index(
            "submissions_student_challenge_idx", "user_id", "challenge_id", text("created_at DESC")
        ),
    )
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("app.users.id", ondelete="CASCADE", name="submissions_user_id_fkey")
    )
    cohort_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("app.cohorts.id", ondelete="CASCADE", name="submissions_cohort_id_fkey")
    )
    challenge_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.challenges.id", ondelete="CASCADE", name="submissions_challenge_id_fkey"),
    )
    attempt_number: Mapped[int] = mapped_column(Integer)
    code_submitted: Mapped[str] = mapped_column(Text)
    auto_result: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    auto_passed: Mapped[bool | None] = mapped_column(Boolean)
    grader_duration_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SubmissionReview(Base):
    __tablename__ = "submission_reviews"
    __table_args__ = (
        Index("submission_reviews_reviewer_idx", "reviewer_id"),
        Index("submission_reviews_submission_idx", "submission_id", text("created_at DESC")),
    )
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    submission_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey(
            "app.submissions.id", ondelete="CASCADE", name="submission_reviews_submission_id_fkey"
        ),
    )
    reviewer_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.users.id", ondelete="RESTRICT", name="submission_reviews_reviewer_id_fkey"),
    )
    verdict: Mapped[str] = mapped_column(
        ENUM(
            "approved",
            "changes_requested",
            "not_reviewed",
            name="review_verdict",
            schema="app",
            create_type=False,
        ),
        server_default=text("'not_reviewed'"),
    )
    note: Mapped[str] = mapped_column(Text, server_default=text("''"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DiagnosticResponse(Base):
    __tablename__ = "diagnostic_responses"
    __table_args__ = (
        CheckConstraint(
            "(phase = ANY (ARRAY['initial'::text, 'final'::text]))",
            name="diagnostic_responses_phase_check",
        ).ddl_if(dialect="postgresql"),
        UniqueConstraint(
            "user_id",
            "phase",
            "question_key",
            name="diagnostic_responses_user_id_phase_question_key_key",
        ),
    )
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.users.id", ondelete="CASCADE", name="diagnostic_responses_user_id_fkey"),
    )
    phase: Mapped[str] = mapped_column(Text)
    question_key: Mapped[str] = mapped_column(Text)
    response: Mapped[Any] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class FeatureFlag(Base):
    __tablename__ = "feature_flags"
    __table_args__ = (
        Index("feature_flags_cohort_idx", "cohort_id"),
        Index(
            "feature_flags_cohort_uidx",
            "key",
            "cohort_id",
            unique=True,
            postgresql_where=text("cohort_id IS NOT NULL"),
        ),
        Index(
            "feature_flags_global_uidx",
            "key",
            unique=True,
            postgresql_where=text("cohort_id IS NULL"),
        ),
        Index("feature_flags_updated_by_idx", "updated_by"),
    )
    key: Mapped[str] = mapped_column(Text)
    cohort_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("app.cohorts.id", ondelete="CASCADE", name="feature_flags_cohort_id_fkey")
    )
    enabled: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    config: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))
    updated_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("app.users.id", ondelete="SET NULL", name="feature_flags_updated_by_fkey")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("audit_log_actor_created_idx", "actor_user_id", text("created_at DESC")),
    )
    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        server_default=text("nextval('app.audit_log_id_seq'::regclass)"),
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("app.users.id", ondelete="SET NULL", name="audit_log_actor_user_id_fkey")
    )
    action: Mapped[str] = mapped_column(Text)
    entity_type: Mapped[str] = mapped_column(Text)
    entity_id: Mapped[str | None] = mapped_column(Text)
    before_state: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserLink(Base):
    __tablename__ = "user_links"
    __table_args__ = (Index("user_links_user_sort_idx", "user_id", "sort_order"),)
    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("app.users.id", ondelete="CASCADE", name="user_links_user_id_fkey")
    )
    label: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
class DemoProgress(Base):
    __tablename__ = "demo_progress"
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("app.users.id", ondelete="CASCADE", name="demo_progress_user_id_fkey"),
        primary_key=True,
    )
    schema_version: Mapped[int] = mapped_column(Integer, server_default=text("1"))
    state_json: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))
    draft_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

