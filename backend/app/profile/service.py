import io
import warnings
from datetime import UTC, datetime

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_verified
from app.core.errors import ApiError
from app.db.models import User
from app.profile.schemas import ProfileUpdate

MAX_AVATAR_BYTES = 5 * 1024 * 1024
MAX_AVATAR_PIXELS = 16_000_000
MAX_AVATAR_SIDE = 4096


async def update_profile(session: AsyncSession, user: User, payload: ProfileUpdate) -> User:
    require_verified(user)
    for field, value in payload.model_dump().items():
        setattr(user, field, value)
    if user.profile_completed_at is None:
        user.profile_completed_at = datetime.now(UTC)
    await session.flush()
    return user


def process_avatar(content: bytes) -> bytes:
    if not content or len(content) > MAX_AVATAR_BYTES:
        raise ApiError(422, "INVALID_AVATAR", "El avatar debe pesar como máximo 5 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as source:
                source.verify()
            with Image.open(io.BytesIO(content)) as source:
                if source.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ApiError(422, "INVALID_AVATAR", "Usa una imagen JPEG, PNG o WebP.")
                width, height = source.size
                if (
                    width < 32
                    or height < 32
                    or width > MAX_AVATAR_SIDE
                    or height > MAX_AVATAR_SIDE
                    or width * height > MAX_AVATAR_PIXELS
                ):
                    raise ApiError(
                        422, "INVALID_AVATAR", "Las dimensiones del avatar no son válidas."
                    )
                image = ImageOps.exif_transpose(source).convert("RGB")
                image.thumbnail((512, 512), Image.Resampling.LANCZOS)
                output = io.BytesIO()
                image.save(output, format="WEBP", quality=86, method=6, exif=b"")
                return output.getvalue()
    except ApiError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError):
        raise ApiError(422, "INVALID_AVATAR", "El archivo no es una imagen válida.") from None
