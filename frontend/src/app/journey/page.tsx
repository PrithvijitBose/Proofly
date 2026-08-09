import { auth } from "@/auth";
import { buildJourneyStory } from "@/lib/github/journey";
import { fetchOwnedRepos, getAuthenticatedUser, GitHubApiError } from "@/lib/github/client";
import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import { Route } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const session = await auth();
  const user = session?.user;

  if (!user || !user.login || !user.accessToken) {
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
      getAuthenticatedUser(user.accessToken),
      fetchOwnedRepos(user.accessToken),
    ]);
    story = buildJourneyStory(ghUser, repos);
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <header className="text-center">
        <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-full ring-2 ring-primary/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.userAvatar} alt={story.userLogin} className="h-full w-full object-cover" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {story.userName}&apos;s Journey
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          @{story.userLogin} · GitHub history, written as a story
        </p>
        {story.userBio ? <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground italic">“{story.userBio}”</p> : null}
      </header>

      {/* Stats strip */}
      <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {story.stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/60 bg-background/50 p-4 text-center">
            <div className="text-2xl font-extrabold text-primary">{stat.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Chapters */}
      <section className="mt-14 space-y-8">
        <h2 className="text-2xl font-bold">The Story</h2>
        {story.chapters.map((chapter) => (
          <article key={chapter.index} className="relative rounded-2xl border border-border/50 bg-background/40 p-6 backdrop-blur-sm">
            <div className="absolute -left-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground sm:flex">
              {chapter.index}
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{chapter.kicker}</p>
            <h3 className="mt-1 text-xl font-bold">{chapter.title}</h3>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {chapter.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {chapter.stats.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {chapter.stats.map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/40 bg-background/60 px-3 py-2">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="font-semibold">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Timeline */}
      {story.timeline.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold">Timeline</h2>
          <ol className="mt-6 space-y-0">
            {story.timeline.map((item, i) => (
              <li key={i} className="relative border-l-2 border-border/30 pb-8 pl-6 last:pb-0">
                <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">{item.date}</div>
                <div className="mt-0.5 font-semibold">{item.title}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{item.detail}</div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}