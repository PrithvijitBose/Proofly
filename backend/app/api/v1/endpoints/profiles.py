import sqlite3
import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
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
def publish_public_profile(username: str, profile: PublicProfileSchema) -> PublicProfileResponse:
    """
    Publish or update a developer's approved profile into shared durable storage.
    Persists the profile to disk before returning a successful response.
    """
    key = username.strip().lower()
    conn = _get_db()
    try:
        data_json = profile.model_dump_json()
        with conn:
            conn.execute(
                """
                INSERT INTO profiles (username, data, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(username) DO UPDATE SET
                    data = excluded.data,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (key, data_json),
            )
    finally:
        conn.close()

    return PublicProfileResponse(status="ok", profile=profile)
