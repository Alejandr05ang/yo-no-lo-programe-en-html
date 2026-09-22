from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

ShortName = Annotated[str, Field(min_length=2, max_length=120)]
Aficion = Annotated[str, Field(min_length=1, max_length=80)]


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    full_name: ShortName
    display_name: Annotated[str, Field(min_length=2, max_length=80)]
    description: Annotated[str, Field(max_length=1000)] = ""
    github_url: Annotated[str | None, Field(max_length=2048)] = None
    linkedin_url: Annotated[str | None, Field(max_length=2048)] = None
    website_url: Annotated[str | None, Field(max_length=2048)] = None
    hobbies: Annotated[list[Aficion], Field(max_length=20)] = []

    @field_validator("github_url", "linkedin_url", "website_url")
    @classmethod
    def safe_https_url(cls, value: str | None) -> str | None:
        if value in {None, ""}:
            return None
        from urllib.parse import urlsplit

        parsed = urlsplit(value)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.fragment
            or parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        ):
            raise ValueError("Profile links must be public HTTPS URLs")
        return value


class AvatarView(BaseModel):
    avatar_url: str
    expires_in: int
