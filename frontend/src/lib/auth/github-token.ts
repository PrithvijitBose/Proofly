import { auth } from "@/auth";
import { getPatToken } from "./pat-token";

/**
 * Server-only: Returns the active GitHub access token.
 * Checks NextAuth OAuth session first, then falls back to custom PAT token cookie.
 */
export async function getGitHubAccessToken(): Promise<string | null> {
  // 1. Try OAuth session token
  const session = await auth();
  if (session?.accessToken) {
    return session.accessToken;
  }

  // 2. Fallback to custom Personal Access Token (PAT)
  const pat = await getPatToken();
  return pat;
}