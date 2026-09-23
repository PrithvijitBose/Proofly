import sqlite3
import json
import os
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, status

from app.schemas.profile import PublicProfileSchema, PublicProfileResponse

router = APIRouter()

# Durable shared storage path across restarts and worker processes
_DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "profiles.db"
DB_PATH = Path(os.getenv("PROFILES_DB_PATH", str(_DEFAULT_DB_PATH)))

GITHUB_API_BASE = "https://api.github.com"
GITHUB_IDENTITY_TIMEOUT = 6.0


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


def _verify_github_identity(authorization: Optional[str]) -> str:
    """
    Resolve the caller's *verified* GitHub login from a bearer token.

    The token is the only trustworthy proof of identity: we hand it to
    GitHub's own /user endpoint and trust the login GitHub returns. A
    self-declared header (e.g. X-Actor-Username) can never stand in for this.

    Raises:
        401 — no/malformed header, or GitHub rejects the token.
        502 — GitHub could not be reached to perform the check.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: provide 'Authorization: Bearer <github_token>'.",
        )

    scheme, _, raw_token = authorization.partition(" ")
    token = raw_token.strip()
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed Authorization header; expected 'Bearer <github_token>'.",
        )

    try:
        resp = httpx.get(
            f"{GITHUB_API_BASE}/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "proofly-backend",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=GITHUB_IDENTITY_TIMEOUT,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach GitHub to verify caller identity.",
        )

    if resp.status_code in (401, 403):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or unauthorized GitHub token.",
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub identity verification failed (status {resp.status_code}).",
        )

    login = resp.json().get("login")
    if not login:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub token did not resolve to a user.",
        )
    return login


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
    authorization: Optional[str] = Header(None),
    x_actor_username: Optional[str] = Header(None, alias="X-Actor-Username"),
) -> PublicProfileResponse:
    """
    Publish or update a developer's approved profile into shared durable storage.

    Ownership is enforced server-side and independently of any frontend: the
    caller must present a valid GitHub bearer token whose *verified* login
    matches the path username. The payload username must also match, and the
    approval flag is force-set by the server.
    """
    normalized_path_user = username.strip().lower()
    normalized_payload_user = profile.username.strip().lower()

    # 1. Verify caller identity against GitHub (authoritative — cannot be spoofed
    #    by a self-declared header, and works even when the frontend is bypassed).
    verified_login = _verify_github_identity(authorization).strip().lower()
    if verified_login != normalized_path_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Authenticated GitHub user '{verified_login}' is not authorized to modify profile for '{username}'.",
        )

    # 2. Validate payload username matches path username
    if normalized_payload_user != normalized_path_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Profile username '{profile.username}' does not match path username '{username}'.",
        )

    # 3. Optional defense-in-depth: if the frontend forwards X-Actor-Username, it
    #    must agree with the verified identity (never used as the sole authority).
    if x_actor_username is not None and x_actor_username.strip().lower() != verified_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Actor header '{x_actor_username}' does not match authenticated GitHub user '{verified_login}'.",
        )

    # 4. Server-enforced approval state
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
