import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";

/**
 * Server-only: returns the GitHub access token from the encrypted Auth.js
 * session cookie.
 *
 * The token is stashed in the session JWT by the `jwt` callback in
 * `src/auth.ts` and deliberately NOT exposed through `session.user`, so it
 * can never be serialized to the client. Only this module (or equivalents
 * that import `next/headers`) may read it — importing it from a client
 * component fails the build.
 */
export async function getGitHubAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  // Dev cookie: authjs.session-token · Production (https): __Secure-authjs.session-token
  const sessionCookie = cookieStore
    .getAll()
    .find((c) => c.name.endsWith("authjs.session-token"));
  if (!sessionCookie) return null;

  const token = await getToken({
    req: { headers: new Headers({ cookie: `${sessionCookie.name}=${sessionCookie.value}` }) },
    cookieName: sessionCookie.name,
    secret: process.env.AUTH_SECRET,
  });
  return (token?.accessToken as string | undefined) ?? null;
}