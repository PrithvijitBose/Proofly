import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** GitHub username (e.g. "octocat") */
      login: string;
      /** GitHub avatar URL */
      avatar: string;
    } & DefaultSession["user"];
  }
}