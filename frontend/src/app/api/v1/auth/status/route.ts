import { NextResponse } from "next/server";
import { getPatToken } from "@/lib/auth/pat-token";
import { isOAuthConfigured } from "@/auth";

/**
 * GET /api/v1/auth/status
 *
 * Diagnostic endpoint for contributors to verify:
 *   - Whether GitHub OAuth credentials are configured
 *   - Whether a PAT token is present and valid
 *   - What authentication method is active
 *
 * This endpoint never exposes actual tokens — only status booleans.
 */
export async function GET() {
  const oauthConfigured = isOAuthConfigured();
  const patToken = await getPatToken();
  const hasPat = Boolean(patToken);

  let patValid = false;
  let patUser: string | null = null;
  let patScopes: string | null = null;

  if (patToken) {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${patToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "proofly-auth-status",
        },
        cache: "no-store",
      });

      if (res.ok) {
        patValid = true;
        const user = await res.json();
        patUser = user.login;
        // GitHub returns granted scopes in the X-OAuth-Scopes header
        patScopes = res.headers.get("x-oauth-scopes");
      }
    } catch {
      // Network error — token validation failed
    }
  }

  const activeMethod = hasPat && patValid
    ? "pat"
    : oauthConfigured
      ? "oauth"
      : "none";

  return NextResponse.json({
    status: "ok",
    auth: {
      oauth_configured: oauthConfigured,
      pat_present: hasPat,
      pat_valid: patValid,
      pat_user: patUser,
      pat_scopes: patScopes,
      active_method: activeMethod,
    },
    help: {
      oauth: oauthConfigured
        ? "GitHub OAuth is configured. Users can sign in with 1-click OAuth."
        : "GitHub OAuth is NOT configured (missing GITHUB_ID / GITHUB_SECRET). Use a PAT token instead.",
      pat: hasPat
        ? patValid
          ? `PAT is valid and authenticated as @${patUser}. Scopes: ${patScopes ?? "unknown"}.`
          : "PAT is present but invalid or expired. Generate a new token at https://github.com/settings/tokens."
        : "No PAT token set. Click 'Use PAT' in the app or set the proofly_pat_token cookie.",
    },
  });
}
