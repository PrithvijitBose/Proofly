import { auth, isOAuthConfigured } from "@/auth";
import { Navbar as NavbarClient } from "./navbar";
import { getPatToken } from "@/lib/auth/pat-token";
import { getAuthenticatedUser } from "@/lib/github/client";

/**
 * Server wrapper: loads the session server-side and passes only safe user
 * fields (name, login, avatar) into the client navbar — never the GitHub
 * access token, which stays server-side via getGitHubAccessToken().
 */
export async function Navbar() {
  let user = null;
  const patToken = await getPatToken();
  if (patToken) {
    try {
      const ghUser = await getAuthenticatedUser(patToken);
      user = {
        name: ghUser.name ?? null,
        login: ghUser.login,
        avatar: ghUser.avatar_url,
      };
    } catch {
      // Stale or invalid PAT
    }
  }

  if (!user) {
    try {
      const session = await auth();
      if (session?.user) {
        user = {
          name: session.user.name ?? null,
          login: session.user.login,
          avatar: session.user.avatar,
        };
      }
    } catch {
      // auth() can throw when OAuth provider is not configured (contributor dev env).
      // This is expected — PAT users are already resolved above.
    }
  }

  return <NavbarClient user={user} oauthConfigured={isOAuthConfigured()} />;
}