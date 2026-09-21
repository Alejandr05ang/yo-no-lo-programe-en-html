from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BootstrapBody(BaseModel):
    model_config = ConfigDict(extra="forbid")


class UserView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    display_name: str
    description: str
    avatar_path: str | None
    github_url: str | None
    linkedin_url: str | None
    website_url: str | None
    role: Literal["student", "instructor", "admin"]
    email_verified: bool
    profile_completed_at: datetime | None
    is_active: bool


class OnboardingView(BaseModel):
    state: Literal[
        "EMAIL_VERIFICATION_REQUIRED", "PROFILE_REQUIRED", "JOIN_CLASS_REQUIRED", "READY"
    ]


class MeView(BaseModel):
    user: UserView
    onboarding: OnboardingView
