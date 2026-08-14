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
      return pat;
    }
  } catch {
    // Cookie read failed — continue to OAuth fallback
  }

  // ── 2. Auth.js session access token (OAuth flow) ──────────────────────
  try {
    const session = await auth();
    if (session?.accessToken) {
      return session.accessToken;
    }
  } catch {
    // auth() can throw when OAuth provider is not configured (no GITHUB_ID/SECRET).
    // This is expected for contributors — fall through silently.
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

export interface ResolvedAuth {
  token: string;
  login: string;
  user: {
    name: string | null;
    login: string;
    avatar?: string;
  };
}

export type AuthResult =
  | { status: "authenticated"; token: string; login: string; user: ResolvedAuth["user"] }
  | { status: "unauthorized" }
  | { status: "upstream_error"; message: string; statusCode?: number };

/**
 * Server-only: returns the authenticated user login and GitHub access token.
 * Supports both OAuth (Auth.js session) and Personal Access Token (PAT cookie).
 * Distinguishes invalid credentials (unauthorized) from GitHub upstream failures.
 */
export async function getAuthenticatedSessionOrPat(): Promise<AuthResult> {
  const token = await getGitHubAccessToken();
  if (!token) return { status: "unauthorized" };

  // 1. NextAuth session (OAuth flow)
  try {
    const session = await auth();
    if (session?.user?.login) {
      return {
        status: "authenticated",
        token,
        login: session.user.login,
        user: {
          name: session.user.name ?? null,
          login: session.user.login,
          avatar: session.user.avatar,
        },
      };
    }
  } catch {
    // Expected when OAuth is not configured
  }

  // 2. PAT fallback: query GitHub /user with the token
  try {
    const { getAuthenticatedUser } = await import("@/lib/github/client");
    const ghUser = await getAuthenticatedUser(token);
    if (ghUser?.login) {
      return {
        status: "authenticated",
        token,
        login: ghUser.login,
        user: {
          name: ghUser.name ?? null,
          login: ghUser.login,
          avatar: ghUser.avatar_url,
        },
      };
    }
    return { status: "unauthorized" };
  } catch (err) {
    const { GitHubApiError } = await import("@/lib/github/client");
    if (err instanceof GitHubApiError) {
      if (err.status === 401 || err.status === 403) {
        return { status: "unauthorized" };
      }
      return {
        status: "upstream_error",
        message: err.message || `GitHub API request failed with status ${err.status}`,
        statusCode: err.status,
      };
    }
    return {
      status: "upstream_error",
      message: err instanceof Error ? err.message : "Failed to communicate with GitHub.",
    };
  }
}
