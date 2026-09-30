import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_verified
from app.catalog.service import require_challenge_access, user_cohort, workshop_access
from app.core.errors import ApiError
from app.db.models import (
    Challenge,
    ChallengeOverride,
    Cohort,
    CohortMembership,
    CohortState,
    PortfolioPublication,
    Progress,
    SessionCatalog,
    User,
)
from app.portfolio.sanitize import sanitize_snapshot
from app.portfolio.schemas import (
    GalleryCard,
    OwnerView,
    PublicationView,
    PublishBody,
    SourceChoice,
    SourceView,
)


def publication_data(user: User) -> dict:
    """Only deliberately visible profile fields; never email/full_name/avatar paths."""
    return {
        "nombre": user.display_name or "Estudiante",
        "sobreMi": user.description,
        "redes": [
            {"nombre": "GitHub", "url": user.github_url or ""},
            {"nombre": "LinkedIn", "url": user.linkedin_url or ""},
            {"nombre": "Sitio web", "url": user.website_url or ""},
        ],
        "hobbies": user.hobbies,
        "proyectos": [],
        "skills": [],
    }


def source_view(user: User, cohort_id: UUID, key: str, progress: Progress) -> SourceView:
    datos = publication_data(user)
    canonical = json.dumps(
        {
            "version": 1,
            "cohort": str(cohort_id),
            "key": key,
            "source": progress.draft_code,
            "datos": datos,
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return SourceView(
        challenge_key=key,
        draft_code=progress.draft_code,
        datos=datos,
        source_fingerprint=hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
    )


async def accessible_sources(
    session: AsyncSession, user: User, cohort: Cohort, state: CohortState | None
):
    access = await workshop_access(session, cohort.id, state)
    rows = (
        await session.execute(
            select(Progress, Challenge, SessionCatalog, ChallengeOverride)
            .join(Challenge, Challenge.id == Progress.challenge_id)
            .join(SessionCatalog, SessionCatalog.id == Challenge.session_id)
            .outerjoin(
                ChallengeOverride,
                (ChallengeOverride.challenge_id == Challenge.id)
                & (ChallengeOverride.cohort_id == cohort.id),
            )
            .where(
                Progress.user_id == user.id,
                Progress.cohort_id == cohort.id,
                Challenge.status == "published",
                SessionCatalog.is_published.is_(True),
            )
            .order_by(SessionCatalog.order_index, Challenge.sort_order)
        )
    ).all()
    return [
        (progress, challenge, day)
        for progress, challenge, day, override in rows
        if progress.draft_code.strip() and access.challenge_unlocked(day, override)
    ]


async def owner_view(
    session: AsyncSession, user: User, challenge_key: str | None = None
) -> OwnerView:
    require_verified(user)
    publication = await session.get(PortfolioPublication, user.id)
    stored = PublicationView.model_validate(publication) if publication else None
    try:
        cohort, state = await user_cohort(session, user)
    except ApiError as error:
        if error.code != "NOT_COHORT_MEMBER":
            raise
        return OwnerView(
            publication=stored,
            sources=[],
            source=None,
            has_unpublished_changes=False,
            can_publish=False,
            publish_block_reason=error.code,
        )
    rows = await accessible_sources(session, user, cohort, state)
    choices = [
        SourceChoice(
            challenge_key=challenge.key,
            title=challenge.title,
            session_code=day.code,
            last_saved_at=progress.last_saved_at,
        )
        for progress, challenge, day in rows
    ]
    by_key = {challenge.key: (progress, challenge) for progress, challenge, _ in rows}
    if challenge_key is not None:
        await require_challenge_access(session, user, challenge_key)
        if challenge_key not in by_key:
            raise ApiError(404, "SOURCE_NOT_FOUND", "Guarda primero el código de ese encargo.")
    else:
        previous_key = publication.source_challenge_key if publication else None
        challenge_key = (
            previous_key
            if previous_key in by_key
            else "e13"
            if "e13" in by_key
            else next(reversed(by_key), None)
        )
    source = None
    if challenge_key:
        progress, _ = by_key[challenge_key]
        source = source_view(user, cohort.id, challenge_key, progress)
    blocked = None
    if source is None:
        blocked = "SOURCE_NOT_FOUND"
    changed = bool(
        source
        and (publication is None or source.source_fingerprint != publication.source_fingerprint)
    )
    return OwnerView(
        publication=stored,
        sources=choices,
        source=source,
        has_unpublished_changes=changed,
        can_publish=blocked is None,
        publish_block_reason=blocked,
    )


async def prepare_snapshot(session: AsyncSession, user: User, body: PublishBody):
    cohort, state = await user_cohort(session, user)
    _, challenge = await require_challenge_access(session, user, body.challenge_key)
    progress = await session.get(Progress, (user.id, cohort.id, challenge.id))
    if progress is None or not progress.draft_code.strip():
        raise ApiError(404, "SOURCE_NOT_FOUND", "Guarda primero el código de ese encargo.")
    source = source_view(user, cohort.id, challenge.key, progress)
    if source.source_fingerprint != body.source_fingerprint:
        raise ApiError(
            409, "SOURCE_CHANGED", "Tu código o perfil cambió. Revisa de nuevo la vista previa."
        )
    return cohort, source, sanitize_snapshot(body.snapshot_html)


async def publish_snapshot(session: AsyncSession, user: User, body: PublishBody) -> OwnerView:
    # CurrentUser locks/revalidates this user, serializing concurrent saves/publishes.
    cohort, source, snapshot = await prepare_snapshot(session, user, body)
    publication = await session.get(PortfolioPublication, user.id)
    now = datetime.now(UTC)
    if publication is None:
        publication = PortfolioPublication(
            user_id=user.id, cohort_id=cohort.id, revision=1, published_at=now
        )
        session.add(publication)
    else:
        publication.revision += 1
    publication.cohort_id = cohort.id
    publication.title = body.title
    publication.snapshot_html = snapshot
    publication.visibility = "cohort"
    publication.source_challenge_key = source.challenge_key
    publication.source_fingerprint = source.source_fingerprint
    publication.is_published = True
    publication.updated_at = now
    await session.flush()
    return await owner_view(session, user, source.challenge_key)


async def unpublish_snapshot(session: AsyncSession, user: User) -> OwnerView:
    require_verified(user)
    publication = await session.get(PortfolioPublication, user.id)
    if publication is not None and publication.is_published:
        publication.is_published = False
        publication.updated_at = datetime.now(UTC)
        await session.flush()
    return await owner_view(session, user)


def visible_publications(cohort_id: UUID):
    return (
        select(PortfolioPublication, User)
        .join(User, User.id == PortfolioPublication.user_id)
        .join(
            CohortMembership,
            (CohortMembership.user_id == User.id)
            & (CohortMembership.cohort_id == PortfolioPublication.cohort_id),
        )
        .join(Cohort, Cohort.id == PortfolioPublication.cohort_id)
        .where(
            PortfolioPublication.cohort_id == cohort_id,
            PortfolioPublication.is_published.is_(True),
            PortfolioPublication.visibility == "cohort",
            User.is_active.is_(True),
            CohortMembership.status == "active",
            Cohort.is_active.is_(True),
        )
    )


def gallery_card(publication: PortfolioPublication, author: User) -> GalleryCard:
    return GalleryCard(
        slug=publication.slug,
        title=publication.title,
        display_name=author.display_name or "Estudiante",
        has_avatar=bool(author.avatar_path),
        updated_at=publication.updated_at,
    )


async def published_site(session: AsyncSession, user: User, slug: str):
    cohort, _ = await user_cohort(session, user)
    row = (
        await session.execute(
            visible_publications(cohort.id).where(PortfolioPublication.slug == slug)
        )
    ).first()
    if row is None:
        raise ApiError(404, "NOT_FOUND", "Portafolio no encontrado.")
    return row
