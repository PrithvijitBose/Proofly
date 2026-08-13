import { auth } from "@/auth";
import { getGitHubAccessToken } from "@/lib/auth/github-token";
import { fetchOwnedRepos, getAuthenticatedUser, GitHubApiError } from "@/lib/github/client";
import { ProjectCuration } from "@/components/curation/project-curation";
import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import { Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await auth();
  let user = session?.user;
  const accessToken = await getGitHubAccessToken();

  if (!user && accessToken) {
    try {
      const ghUser = await getAuthenticatedUser(accessToken);
      user = {
        name: ghUser.name ?? null,
        login: ghUser.login,
        avatar: ghUser.avatar_url,
      } as any;
    } catch {
      // Invalid PAT
    }
  }

  if (!user || !user.login || !accessToken) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-proof-amber/10 text-proof-amber">
          <Layers className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white font-display">
          Curate Your Professional GitHub Projects
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-proof-ash">
          Sign in with GitHub to view your repositories, select which projects represent your true professional identity, prioritize them, and annotate custom highlights.
        </p>
        <div className="mt-8 flex justify-center">
          <GitHubSignInButton label="Connect GitHub & curate projects" callbackUrl="/projects" />
        </div>
      </div>
    );
  }

  try {
    const [ghUser, repos] = await Promise.all([
      getAuthenticatedUser(accessToken),
      fetchOwnedRepos(accessToken),
    ]);

    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <ProjectCuration availableRepos={repos} user={ghUser} />
      </div>
    );
  } catch (err) {
    const message =
      err instanceof GitHubApiError
        ? err.message
        : "Failed to fetch repositories from GitHub.";
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-white font-display">Couldn&apos;t load repositories</h1>
        <p className="mt-3 text-proof-ash">{message}</p>
      </div>
    );
  }
}
