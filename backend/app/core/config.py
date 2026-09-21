from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    app_origin: str = "http://localhost:5173"
    database_url: SecretStr | None = None
    database_ssl_ca_file: str | None = None
    firebase_project_id: str | None = None
    google_application_credentials: str | None = None
    supabase_url: str | None = None
    supabase_secret_key: SecretStr | None = None
    max_request_bytes: int = Field(default=6 * 1024 * 1024, gt=0, le=6 * 1024 * 1024)
    rate_limit_per_minute: int = Field(default=120, gt=0)
    auth_rate_limit_per_minute: int = Field(default=20, gt=0)
    rate_limit_max_clients: int = Field(default=10_000, gt=0, le=100_000)

    @field_validator("app_origin")
    @classmethod
    def exact_origin(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.path
            or parsed.query
            or parsed.fragment
            or any(character in value for character in ("*", ",", " ", "\\"))
        ):
            raise ValueError("APP_ORIGIN must be one exact HTTP(S) origin without a path")
        return value

    @field_validator(
        "database_url",
        "database_ssl_ca_file",
        "firebase_project_id",
        "google_application_credentials",
        "supabase_url",
        "supabase_secret_key",
        mode="before",
    )
    @classmethod
    def empty_is_none(cls, value):
        return None if value == "" else value
