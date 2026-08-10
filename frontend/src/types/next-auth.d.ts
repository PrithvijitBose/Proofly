import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      /** GitHub username (e.g. "octocat") */
      login: string;
      /** GitHub avatar URL */
      avatar: string;
    } & DefaultSession["user"];
  }
}