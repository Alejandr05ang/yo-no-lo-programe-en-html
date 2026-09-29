from fastapi import APIRouter, Request, Response

from app.auth.dependencies import CurrentUser
from app.catalog.service import user_cohort
from app.core.errors import ApiError
from app.db.models import PortfolioPublication
from app.db.session import SessionDep
from app.portfolio.schemas import (
    GalleryView,
    OwnerView,
    PublishBody,
    PublishedSite,
    SnapshotPreview,
)
from app.portfolio.service import (
    gallery_card,
    owner_view,
    prepare_snapshot,
    publish_snapshot,
    published_site,
    unpublish_snapshot,
    visible_publications,
)
from app.profile.service import process_avatar
from app.profile.storage import AvatarStorage

router = APIRouter(prefix="/api", tags=["portfolio"])


@router.get("/portfolio/publication", response_model=OwnerView)
async def get_publication(user: CurrentUser, session: SessionDep, challenge_key: str | None = None):
    return await owner_view(session, user, challenge_key)


@router.post("/portfolio/publication/preview", response_model=SnapshotPreview)
async def preview_publication(body: PublishBody, user: CurrentUser, session: SessionDep):
    _, source, snapshot = await prepare_snapshot(session, user, body)
    return SnapshotPreview(snapshot_html=snapshot, source_fingerprint=source.source_fingerprint)


@router.post("/portfolio/publication/publish", response_model=OwnerView)
async def publish_publication(body: PublishBody, user: CurrentUser, session: SessionDep):
    return await publish_snapshot(session, user, body)


@router.post("/portfolio/publication/unpublish", response_model=OwnerView)
async def unpublish_publication(user: CurrentUser, session: SessionDep):
    return await unpublish_snapshot(session, user)


@router.get("/cohort/gallery", response_model=GalleryView)
async def get_gallery(user: CurrentUser, session: SessionDep):
    cohort, _ = await user_cohort(session, user)
    rows = (
        await session.execute(
            visible_publications(cohort.id).order_by(
                PortfolioPublication.updated_at.desc(), PortfolioPublication.slug
            )
        )
    ).all()
    return GalleryView(items=[gallery_card(publication, author) for publication, author in rows])


@router.get("/cohort/portfolios/{slug}", response_model=PublishedSite)
async def get_site(slug: str, user: CurrentUser, session: SessionDep):
    publication, author = await published_site(session, user, slug)
    return PublishedSite(
        **gallery_card(publication, author).model_dump(), snapshot_html=publication.snapshot_html
    )


@router.get("/cohort/portfolios/{slug}/avatar")
async def get_site_avatar(slug: str, request: Request, user: CurrentUser, session: SessionDep):
    _, author = await published_site(session, user, slug)
    expected_path = f"{author.id}/avatar.webp"
    if author.avatar_path != expected_path:
        raise ApiError(404, "AVATAR_NOT_FOUND", "Este portafolio no tiene avatar.")
    # Read bytes through the server credential. Never expose a signed URL or object path.
    content = await AvatarStorage(request.app.state.settings).download(expected_path)
    return Response(content=process_avatar(content), media_type="image/webp")
