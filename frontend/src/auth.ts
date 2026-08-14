import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js (next-auth v5) configuration for Proofly.
 *
 * Strategy: JWT sessions. The GitHub access token is stored inside the
 * encrypted session cookie and is only ever read on the server (route
 * handlers / server components / server actions) — never serialized to
 * the client. Auth checks intentionally live in server components and
 * route handlers (not middleware) to stay clear of the CVE-2025-29927
 * middleware bypass class of bugs.
 *
 * IMPORTANT — Contributor-safe initialisation:
 * When GITHUB_ID / GITHUB_SECRET are missing (contributor dev environment
 * without an OAuth App), the GitHub provider is NOT registered. Auth.js
 * still boots with an empty providers array so `auth()` calls return null
 * instead of crashing the entire app with "Server error — There is a
 * problem with the server configuration."  Contributors authenticate
 * exclusively via the PAT cookie flow.
 *
 * Env vars required for OAuth (Option A / C only):
 *   - AUTH_SECRET       : random secret used to encrypt the session JWT
 *   - GITHUB_ID         : GitHub OAuth app client id
 *   - GITHUB_SECRET     : GitHub OAuth app client secret
 */

// ---------------------------------------------------------------------------
// Detect whether real GitHub OAuth credentials are present
// ---------------------------------------------------------------------------
const _githubId = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID || "";
const _githubSecret = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET || "";

const PLACEHOLDER_VALUES = [
  "",
  "your_github_client_id",
  "your_github_client_secret",
];

/**
 * Returns `true` when valid GitHub OAuth App credentials are configured.
 * Safe to call on both server and during build.
 */
export function isOAuthConfigured(): boolean {
  return (
    !PLACEHOLDER_VALUES.includes(_githubId) &&
    !PLACEHOLDER_VALUES.includes(_githubSecret)
  );
}

// ---------------------------------------------------------------------------
// Build providers list — only include GitHub when credentials exist
// ---------------------------------------------------------------------------
const providers = isOAuthConfigured()
  ? [
      GitHub({
        clientId: _githubId,
        clientSecret: _githubSecret,
        authorization: {
          params: { scope: "read:user" },
        },
      }),
    ]
  : [];

if (!isOAuthConfigured()) {
  console.warn(
    "[auth] GitHub OAuth credentials are missing — OAuth sign-in is disabled. " +
      "Contributors can authenticate with a Personal Access Token (PAT) instead."
  );
}

// ---------------------------------------------------------------------------
// NextAuth instance
// ---------------------------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-not-for-production",
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // First sign-in: stash the GitHub access token in the session JWT.
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.login = profile.login as string;
        token.avatar = profile.avatar_url as string;
        // Surface a richer display name than a fresh account's null name.
        token.name = (token.name as string) ?? (profile.name as string | null) ?? (profile.login as string);
      }
      return token;
    },
    async session({ session, token }) {
      session.user.login = token.login as string;
      session.user.avatar = token.avatar as string;
      session.user.name = (token.name as string) ?? (token.login as string);
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});