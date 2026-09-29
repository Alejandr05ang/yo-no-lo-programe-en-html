from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class PublishBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    challenge_key: str = Field(pattern=r"^e[1-9][0-9]?$", max_length=3)
    title: str = Field(min_length=1, max_length=120)
    snapshot_html: str = Field(min_length=1, max_length=250_000)
    source_fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")
    visibility: Literal["cohort"] = "cohort"


class PublicationView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    visibility: Literal["cohort"]
    snapshot_html: str
    source_challenge_key: str
    source_fingerprint: str
    revision: int
    published_at: datetime
    updated_at: datetime
    is_published: bool


class SourceChoice(BaseModel):
    challenge_key: str
    title: str
    session_code: str
    last_saved_at: datetime | None


class SourceView(BaseModel):
    challenge_key: str
    draft_code: str
    datos: dict[str, Any]
    source_fingerprint: str


class OwnerView(BaseModel):
    publication: PublicationView | None
    sources: list[SourceChoice]
    source: SourceView | None
    has_unpublished_changes: bool
    can_publish: bool
    publish_block_reason: str | None


class SnapshotPreview(BaseModel):
    snapshot_html: str
    source_fingerprint: str


class GalleryCard(BaseModel):
    slug: str
    title: str
    display_name: str
    has_avatar: bool
    updated_at: datetime


class GalleryView(BaseModel):
    items: list[GalleryCard]


class PublishedSite(GalleryCard):
    snapshot_html: str
