import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import { getPatToken } from "./pat-token";

/**
 * Server-only: returns the GitHub access token.
 *
 * Reads the token from the encrypted Auth.js JWT session cookie on the server
 * first, so `accessToken` never needs to be exposed on the `session` object.
 * Resolves effective session cookie configuration (__Secure- prefix in HTTPS production).
 * Falls back to a custom Personal Access Token (PAT) if signed out of OAuth.
 */
export async function getGitHubAccessToken(): Promise<string | null> {
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
    // If JWT retrieval fails or is not present, fall through to PAT
  }

  // Fallback to custom Personal Access Token (PAT)
  return getPatToken();
}