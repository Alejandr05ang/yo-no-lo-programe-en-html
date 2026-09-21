from urllib.parse import quote, urlsplit

import httpx

from app.core.config import Settings
from app.core.errors import ApiError


class AvatarStorage:
    bucket = "avatars"

    def __init__(self, settings: Settings):
        if settings.supabase_url is None or settings.supabase_secret_key is None:
            raise ApiError(503, "STORAGE_NOT_CONFIGURED", "El almacenamiento no está configurado.")
        parsed = urlsplit(settings.supabase_url)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
        ):
            raise ApiError(503, "STORAGE_NOT_CONFIGURED", "El almacenamiento no está configurado.")
        self.base_url = settings.supabase_url.rstrip("/")
        self.key = settings.supabase_secret_key.get_secret_value()

    @property
    def headers(self) -> dict[str, str]:
        return {"apikey": self.key, "Authorization": f"Bearer {self.key}"}

    async def upload(self, path: str, content: bytes) -> None:
        encoded = quote(path, safe="/")
        headers = {
            **self.headers,
            "Content-Type": "image/webp",
            "x-upsert": "true",
            "Cache-Control": "3600",
        }
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.post(
                    f"{self.base_url}/storage/v1/object/{self.bucket}/{encoded}",
                    headers=headers,
                    content=content,
                )
            if response.status_code not in {200, 201}:
                raise ApiError(503, "STORAGE_UNAVAILABLE", "No se pudo guardar el avatar.")
        except httpx.HTTPError:
            raise ApiError(503, "STORAGE_UNAVAILABLE", "No se pudo guardar el avatar.") from None

    async def signed_url(self, path: str, expires_in: int = 900) -> str:
        encoded = quote(path, safe="/")
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
                response = await client.post(
                    f"{self.base_url}/storage/v1/object/sign/{self.bucket}/{encoded}",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json={"expiresIn": expires_in},
                )
            if response.status_code != 200:
                raise ApiError(503, "STORAGE_UNAVAILABLE", "No se pudo abrir el avatar.")
            signed = response.json().get("signedURL")
            if not isinstance(signed, str) or not signed.startswith("/"):
                raise ApiError(503, "STORAGE_UNAVAILABLE", "No se pudo abrir el avatar.")
            return self.base_url + signed
        except (httpx.HTTPError, ValueError):
            raise ApiError(503, "STORAGE_UNAVAILABLE", "No se pudo abrir el avatar.") from None

    async def delete(self, path: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
                response = await client.request(
                    "DELETE",
                    f"{self.base_url}/storage/v1/object/{self.bucket}",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json={"prefixes": [path]},
                )
            if response.status_code not in {200, 204}:
                raise ApiError(503, "STORAGE_UNAVAILABLE", "No se pudo eliminar el avatar.")
        except httpx.HTTPError:
            raise ApiError(503, "STORAGE_UNAVAILABLE", "No se pudo eliminar el avatar.") from None
