import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** GitHub username (e.g. "octocat") */
      login: string;
      /** GitHub avatar URL */
      avatar: string;
      /** GitHub access token. Server-side only — never render or pass to client components. */
      accessToken: string;
    } & DefaultSession["user"];
  }
}