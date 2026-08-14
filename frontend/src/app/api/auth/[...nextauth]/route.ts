import { handlers, isOAuthConfigured } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Robust Auth.js catch-all route handler.
 *
 * 1. If OAuth is NOT configured (contributors), any callback/signin request
 *    is redirected to `/?auth=pat` to auto-open the PAT token modal.
 * 2. If someone directly visits `/api/auth/callback/github` in their browser
 *    without a GitHub OAuth `code` parameter (i.e. not an active GitHub redirect),
 *    redirects them to `/` instead of letting Auth.js show "Server error".
 * 3. Otherwise, delegates to Auth.js handlers for full OAuth flow.
 */
function createFallbackHandler(method: "GET" | "POST") {
  return async (req: NextRequest) => {
    const url = new URL(req.url);
    const path = url.pathname;

    // Case 1: OAuth not configured (Contributor environment)
    if (!isOAuthConfigured()) {
      const isCallbackOrSignin =
        path.includes("/api/auth/callback") ||
        path.includes("/api/auth/signin");

      if (isCallbackOrSignin) {
        const redirectUrl = new URL("/", req.url);
        redirectUrl.searchParams.set("auth", "pat");
        redirectUrl.searchParams.set(
          "message",
          "OAuth is not configured. Use a Personal Access Token (PAT) to authenticate."
        );
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Case 2: Direct browser hit on /api/auth/callback/* without a ?code= parameter
    if (path.includes("/api/auth/callback") && method === "GET") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      
      // If there's no code and no OAuth error param, user navigated directly to the URL
      if (!code && !error) {
        const redirectUrl = new URL("/", req.url);
        redirectUrl.searchParams.set(
          "message",
          "OAuth callback URL is meant for GitHub redirects, not direct browser access. Sign in using the button."
        );
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Case 3: Standard Auth.js execution
    try {
      const handler = method === "GET" ? handlers.GET : handlers.POST;
      const response = await handler(req);
      return response;
    } catch (err) {
      console.error("[Auth.js error]", err);
      const redirectUrl = new URL("/", req.url);
      redirectUrl.searchParams.set("error", "OAuthCallbackError");
      return NextResponse.redirect(redirectUrl);
    }
  };
}

export const GET = createFallbackHandler("GET");
export const POST = createFallbackHandler("POST");