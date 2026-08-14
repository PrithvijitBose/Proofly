import { NextResponse } from "next/server";
import { isOAuthConfigured } from "@/auth";

/**
 * GET /api/v1/auth/oauth-status
 *
 * Lightweight endpoint that returns whether GitHub OAuth is configured.
 * Used by client components to decide whether to show OAuth or PAT-first UI.
 * Does NOT expose any credentials.
 */
export async function GET() {
  return NextResponse.json({
    configured: isOAuthConfigured(),
  });
}
