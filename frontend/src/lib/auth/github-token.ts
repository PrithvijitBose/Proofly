import { auth } from "@/auth";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import { getPatToken } from "./pat-token";

/**
 * Server-only: returns the GitHub access token.
 *
 * Resolution order:
 *   1. Custom Personal Access Token (PAT) cookie — lets contributors
 *      override OAuth and work without registering a GitHub OAuth App.
 *   2. Auth.js session (`auth()`) — standard OAuth flow.
 *   3. Direct JWT cookie decryption — fallback for edge cases.
 *
 * Every step is wrapped in try/catch so a missing OAuth configuration
 * (contributor dev environment) never crashes the calling page.
 */
export async function getGitHubAccessToken(): Promise<string | null> {
  // ── 1. PAT cookie (highest priority — contributor override) ───────────
  try {
    const pat = await getPatToken();
    if (pat) {
      console.log("[getGitHubAccessToken] Using PAT token:", pat.slice(0, 8) + "...");
      return pat;
    }
  } catch {
    // Cookie read failed — continue to OAuth fallback
  }

  // ── 2. Auth.js session access token (OAuth flow) ──────────────────────
  try {
    const session = await auth();
    if (session?.accessToken) {
      console.log("[getGitHubAccessToken] Using OAuth token from NextAuth session");
      return session.accessToken;
    }
  } catch {
    // auth() can throw when OAuth provider is not configured (no GITHUB_ID/SECRET).
    // This is expected for contributors — fall through silently.
    console.log("[getGitHubAccessToken] auth() unavailable (OAuth likely not configured)");
  }

  // ── 3. Direct JWT cookie decryption (edge-case fallback) ──────────────
  try {
    const cookieStore = await cookies();
    const cookieList = cookieStore.getAll();
    const cookieHeader = cookieList
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    if (cookieHeader) {
      const headerStore = await headers();
      const reqHeaders = new Headers(headerStore);
      reqHeaders.set("cookie", cookieHeader);

      const sessionCookie = cookieList.find((c) => c.name.includes("session-token"));
      const isSecure =
        process.env.NODE_ENV === "production" ||
        reqHeaders.get("x-forwarded-proto") === "https" ||
        cookieList.some((c) => c.name.startsWith("__Secure-"));

      const baseCookieName = sessionCookie ? sessionCookie.name.split(".")[0] : undefined;

      const token = await getToken({
        req: { headers: reqHeaders },
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
        secureCookie: isSecure,
        ...(baseCookieName ? { cookieName: baseCookieName } : {}),
      });

      if (token?.accessToken) {
        return token.accessToken as string;
      }
    }
  } catch {
    // JWT decryption can fail when AUTH_SECRET is missing or cookie is stale
  }

  // ── 4. Final PAT fallback (in case cookie read raced earlier) ─────────
  try {
    return await getPatToken();
  } catch {
    return null;
  }
}