import { auth } from "@/auth";
import { Navbar as NavbarClient } from "./navbar";

/**
 * Server wrapper: loads the session server-side and passes only safe user
 * fields (name, login, avatar) into the client navbar — never the GitHub
 * access token, which stays server-side via getGitHubAccessToken().
 */
export async function Navbar() {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        login: session.user.login,
        avatar: session.user.avatar,
      }
    : null;

  return <NavbarClient user={user} />;
}