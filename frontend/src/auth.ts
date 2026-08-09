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
 * Env vars required:
 *   - AUTH_SECRET       : random secret used to encrypt the session JWT
 *   - GITHUB_ID         : GitHub OAuth app client id
 *   - GITHUB_SECRET     : GitHub OAuth app client secret
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: { scope: "read:user user:email" },
      },
    }),
  ],
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
      // Server-side only: used by the journey page to talk to the GitHub API.
      session.user.accessToken = token.accessToken as string;
      return session;
    },
  },
});