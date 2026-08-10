import { auth } from "@/auth";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import { getPatToken } from "./pat-token";

/**
 * Server-only: returns the GitHub access token.
 *
 * Checks `session.accessToken` via `auth()` first for clean 100% reliable server-side
 * retrieval. If not present on session, attempts server-side JWT cookie decryption,
 * falling back to custom PAT token cookie.
 */
export async function getGitHubAccessToken(): Promise<string | null> {
  // 1. Try NextAuth session access token directly
  try {
    const session = await auth();
    if (session?.accessToken) {
      return session.accessToken;
    }
  } catch {
    // Ignore error
  }

  // 2. Try reading access token from Auth.js JWT cookie on server
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
    // Fall through to PAT
  }

  // 3. Fallback to custom Personal Access Token (PAT)
  return getPatToken();
}