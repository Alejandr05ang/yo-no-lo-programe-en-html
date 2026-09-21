from fastapi import APIRouter, File, Request, UploadFile

from app.auth.dependencies import CurrentUser
from app.auth.schemas import MeView
from app.auth.service import me_view
from app.db.session import SessionDep
from app.profile.schemas import AvatarView, ProfileUpdate
from app.profile.service import MAX_AVATAR_BYTES, process_avatar, update_profile
from app.profile.storage import AvatarStorage

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.put("", response_model=MeView)
async def save_profile(payload: ProfileUpdate, user: CurrentUser, session: SessionDep):
    await update_profile(session, user, payload)
    return await me_view(session, user)


@router.post("/avatar", response_model=AvatarView)
async def save_avatar(
    request: Request,
    user: CurrentUser,
    session: SessionDep,
    avatar: UploadFile = File(...),
):
    content = await avatar.read(MAX_AVATAR_BYTES + 1)
    processed = process_avatar(content)
    path = f"{user.id}/avatar.webp"
    storage = AvatarStorage(request.app.state.settings)
    await storage.upload(path, processed)
    user.avatar_path = path
    await session.flush()
    return AvatarView(avatar_url=await storage.signed_url(path), expires_in=900)


@router.get("/avatar", response_model=AvatarView)
async def get_avatar(request: Request, user: CurrentUser):
    if user.avatar_path is None:
        from app.core.errors import ApiError

        raise ApiError(404, "AVATAR_NOT_FOUND", "Todavía no tienes avatar.")
    storage = AvatarStorage(request.app.state.settings)
    return AvatarView(avatar_url=await storage.signed_url(user.avatar_path), expires_in=900)
