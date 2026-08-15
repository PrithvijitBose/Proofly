import { NextRequest, NextResponse } from "next/server";
import { PublicProfile } from "@/lib/github/profile-store";
import {
  resolvePublicProfile,
  setCachedProfile,
} from "@/lib/github/public-profile-service";
import { getApiUrl, DEFAULT_PRODUCTION_APP_URL } from "@/config/env";

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
 * Saves/updates a published profile in server memory and forwards to backend.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const key = username.trim().toLowerCase();

  try {
    const profile = (await request.json()) as PublicProfile;
    if (!profile || !profile.username || !profile.narrative) {
      return NextResponse.json(
        { error: "invalid_body", message: "Invalid profile payload." },
        { status: 400 }
      );
    }

    // Save in server cache
    setCachedProfile(key, profile);

    // Forward to backend if available
    try {
      const backendUrl = getApiUrl(`/api/v1/profiles/${encodeURIComponent(key)}`);
      await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    } catch {
      // Backend not running
    }

    return NextResponse.json({ status: "ok", profile });
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
