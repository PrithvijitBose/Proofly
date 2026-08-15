import { NextRequest, NextResponse } from "next/server";
import { PublicProfile, isValidPublicProfile } from "@/lib/github/profile-store";
import {
  resolvePublicProfile,
  setCachedProfile,
} from "@/lib/github/public-profile-service";
import { getApiUrl, DEFAULT_PRODUCTION_APP_URL } from "@/config/env";
import { getAuthenticatedSessionOrPat } from "@/lib/auth/github-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/[username]
 *
 * Public endpoint. Retrieves a developer's published profile or resolves
 * live from GitHub API for any valid GitHub user.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const decodedUsername = decodeURIComponent(username).trim();

  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const hostOrigin = host ? `${proto}://${host}` : DEFAULT_PRODUCTION_APP_URL;

  const profile = await resolvePublicProfile(decodedUsername, hostOrigin);

  if (!profile) {
    return NextResponse.json(
      { error: "not_found", message: `GitHub user @${username} was not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({ status: "ok", profile });
}

/**
 * POST /api/profile/[username]
 *
 * Saves/updates a published profile in durable storage and server cache.
 * Requires an authenticated user whose normalized identity matches the route username.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const key = username.trim().toLowerCase();

  try {
    // 1. Require authenticated session or PAT
    const auth = await getAuthenticatedSessionOrPat();
    if (auth.status !== "authenticated") {
      return NextResponse.json(
        {
          error: "unauthorized",
          message: "Authentication required to publish or update a developer profile.",
        },
        { status: 401 }
      );
    }

    const normalizedActor = auth.login.trim().toLowerCase();
    if (normalizedActor !== key) {
      return NextResponse.json(
        {
          error: "forbidden",
          message: `Authenticated user '@${auth.login}' is not authorized to modify profile for '@${username}'.`,
        },
        { status: 403 }
      );
    }

    // 2. Parse and validate complete PublicProfile payload
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_body", message: "Malformed JSON payload." },
        { status: 400 }
      );
    }

    if (!isValidPublicProfile(rawBody)) {
      return NextResponse.json(
        {
          error: "invalid_body",
          message: "Invalid or incomplete PublicProfile payload structure.",
        },
        { status: 400 }
      );
    }

    const profile = rawBody as PublicProfile;
    const payloadUser = profile.username.trim().toLowerCase();
    if (payloadUser !== key) {
      return NextResponse.json(
        {
          error: "mismatched_username",
          message: `Payload username '${profile.username}' does not match route username '${username}'.`,
        },
        { status: 400 }
      );
    }

    // 3. Trusted server-side approval enforcement
    const approvedProfile: PublicProfile = {
      ...profile,
      isApproved: true,
    };

    // 4. Persist to durable backend service first
    const backendUrl = getApiUrl(`/api/v1/profiles/${encodeURIComponent(key)}`);
    try {
      const backendRes = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Actor-Username": auth.login,
        },
        body: JSON.stringify(approvedProfile),
      });

      if (!backendRes.ok) {
        const errorData = await backendRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: "backend_error",
            message:
              errorData.detail ||
              errorData.message ||
              `Backend durable persistence failed with status ${backendRes.status}.`,
          },
          { status: backendRes.status >= 400 && backendRes.status < 600 ? backendRes.status : 502 }
        );
      }

      // 5. Durable persistence succeeded -> commit to in-memory cache
      setCachedProfile(key, approvedProfile);

      return NextResponse.json({ status: "ok", profile: approvedProfile });
    } catch {
      return NextResponse.json(
        {
          error: "backend_unavailable",
          message: "Durable profile backend service is currently unreachable.",
        },
        { status: 503 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "save_error",
        message: err instanceof Error ? err.message : "Failed to save profile.",
      },
      { status: 500 }
    );
  }
}
