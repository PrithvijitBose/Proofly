import { getAuthenticatedSessionOrPat } from "@/lib/auth/github-token";
import { buildJourneyStory } from "@/lib/github/journey";
import { fetchOwnedRepos, getAuthenticatedUser, GitHubApiError } from "@/lib/github/client";
import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import { JourneyFlow } from "@/components/journey/journey-flow";
import { Route } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Journey page v2.
 *
 * Server shell: auth gate, hero for unauthenticated visitors, and a
 * deterministic story rendered instantly (SSR) so the client flow has
 * in-flight content while the AI narrative generates. Curated repos live
 * in localStorage (client-only), so this SSR story covers all owned repos
 * as a first-paint superset; <JourneyFlow> immediately rebuilds the
 * deterministic story from the curated set so the fallback matches the AI
 * narrative's curated scope. All interactivity — reading curated repos,
 * POSTing /api/journey/generate, rendering the guardrailed narrative with
 * citation chips — lives in the client <JourneyFlow>.
 */
export default async function JourneyPage() {
  const authData = await getAuthenticatedSessionOrPat();
  const user = authData?.user;
  const accessToken = authData?.token;

  if (!user || !user.login || !accessToken) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Route className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your GitHub story, told as a journey
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Connect your GitHub account and Proofly will read your public history — first repositories,
          language shifts, breakout projects — and write the chapters of your journey.
        </p>
        <div className="mt-8 flex justify-center">
          <GitHubSignInButton label={"Connect GitHub & start my story"} />
        </div>
      </div>
    );
  }

  let story;
  try {
    const [ghUser, repos] = await Promise.all([
      getAuthenticatedUser(accessToken),
      fetchOwnedRepos(accessToken),
    ]);
    story = buildJourneyStory(ghUser, repos);
    return <JourneyFlow user={ghUser} deterministicStory={story} />;
  } catch (err) {
    const message =
      err instanceof GitHubApiError ? err.message : "Something went wrong while reading your GitHub history.";
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Couldn&apos;t read your journey</h1>
        <p className="mt-3 text-muted-foreground">{message}</p>
      </div>
    );
  }
}