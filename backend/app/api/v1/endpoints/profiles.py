import sqlite3
import json
import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas.profile import PublicProfileSchema, PublicProfileResponse

router = APIRouter()

# Durable shared storage path across restarts and worker processes
_DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "profiles.db"
DB_PATH = Path(os.getenv("PROFILES_DB_PATH", str(_DEFAULT_DB_PATH)))


def _get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS profiles (
            username TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return conn


@router.get(
    "/profiles/{username}",
    response_model=PublicProfileResponse,
    summary="Get public developer professional identity profile",
)
def get_public_profile(username: str) -> PublicProfileResponse:
    """
    Fetch the public, shareable professional identity for a given developer username
    from shared durable storage.
    """
    key = username.strip().lower()
    conn = _get_db()
    try:
        cursor = conn.execute("SELECT data FROM profiles WHERE username = ?", (key,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Public profile for developer '{username}' was not found.",
            )
        profile_dict = json.loads(row[0])
        profile = PublicProfileSchema.model_validate(profile_dict)
    finally:
        conn.close()

    return PublicProfileResponse(status="ok", profile=profile)


@router.post(
    "/profiles/{username}",
    response_model=PublicProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Publish or update public developer profile",
)
def publish_public_profile(
    username: str,
    profile: PublicProfileSchema,
    x_actor_username: Optional[str] = Header(None, alias="X-Actor-Username"),
) -> PublicProfileResponse:
    """
    Publish or update a developer's approved profile into shared durable storage.
    Validates that actor identity and profile.username both match the normalized path username,
    and sets trusted server-side approval before saving.
    """
    normalized_path_user = username.strip().lower()
    normalized_payload_user = profile.username.strip().lower()

    # 1. Validate payload username matches path username
    if normalized_payload_user != normalized_path_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Profile username '{profile.username}' does not match path username '{username}'.",
        )

    # 2. Validate actor ownership if actor header is supplied
    if x_actor_username is not None:
        normalized_actor = x_actor_username.strip().lower()
        if normalized_actor != normalized_path_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Actor '{x_actor_username}' is not authorized to modify profile for '{username}'.",
            )

    # 3. Server-enforced approval state
    validated_profile = profile.model_copy(
        update={
            "isApproved": True,
        }
    )

    conn = _get_db()
    try:
        data_json = validated_profile.model_dump_json()
        with conn:
            conn.execute(
                """
                INSERT INTO profiles (username, data, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(username) DO UPDATE SET
                    data = excluded.data,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (normalized_path_user, data_json),
            )
    finally:
        conn.close()

    return PublicProfileResponse(status="ok", profile=validated_profile)
