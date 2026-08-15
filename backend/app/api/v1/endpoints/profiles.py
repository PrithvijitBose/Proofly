from fastapi import APIRouter, HTTPException, status
from typing import Dict
from app.schemas.profile import PublicProfileSchema, PublicProfileResponse

router = APIRouter()

# In-memory storage cache for published profiles (persists during process lifetime)
_PROFILE_STORE: Dict[str, PublicProfileSchema] = {}


@router.get(
    "/profiles/{username}",
    response_model=PublicProfileResponse,
    summary="Get public developer professional identity profile",
)
def get_public_profile(username: str) -> PublicProfileResponse:
    """
    Fetch the public, shareable professional identity for a given developer username.
    Accessible publicly by any visitor without authentication.
    """
    key = username.strip().lower()
    profile = _PROFILE_STORE.get(key)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Public profile for developer '{username}' was not found.",
        )
    return PublicProfileResponse(status="ok", profile=profile)


@router.post(
    "/profiles/{username}",
    response_model=PublicProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Publish or update public developer profile",
)
def publish_public_profile(username: str, profile: PublicProfileSchema) -> PublicProfileResponse:
    """
    Publish or update a developer's approved profile.
    Ensures that the canonical URL and QR code continue pointing to the latest version.
    """
    key = username.strip().lower()
    _PROFILE_STORE[key] = profile
    return PublicProfileResponse(status="ok", profile=profile)
