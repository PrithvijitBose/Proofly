"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, ShieldAlert, Sparkles, BookmarkCheck } from "lucide-react";
import type { GitHubUser } from "@/lib/github/client";
import type { JourneyStory } from "@/lib/github/journey";
import type { GuardedNarrative } from "@/lib/github/guardrails";
import type { EvidenceRecord } from "@/lib/github/evidence";
import type { PatternFact } from "@/lib/github/patterns";
import type { CuratedProject } from "@/lib/github/curation";
import { loadCuratedProjects } from "@/lib/github/curation";
import { Narrative } from "./narrative";
import { EvidencePanel } from "./evidence-panel";
import { Button } from "@/components/ui/button";

type FlowStatus = "checking" | "empty" | "loading" | "ready" | "degraded" | "error";

interface GenerateResponse {
  narrative: GuardedNarrative | null;
  evidence?: EvidenceRecord[];
  patterns?: PatternFact[];
  warnings?: string[];
  repos?: CuratedProject[];
  error?: string;
  message?: string;
}

interface JourneyFlowProps {
  user: GitHubUser;
  deterministicStory: JourneyStory;
}

export function JourneyFlow({ user, deterministicStory }: JourneyFlowProps) {
  const [status, setStatus] = useState<FlowStatus>("checking");
  const [narrative, setNarrative] = useState<GuardedNarrative | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [patterns, setPatterns] = useState<PatternFact[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generatedRepos, setGeneratedRepos] = useState<CuratedProject[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const generate = useCallback(async () => {
    const curated = loadCuratedProjects(user.login);
    if (curated.length === 0) {
      setStatus("empty");
      return;
    }
    setStatus("loading");
    setNarrative(null);
    setMessage(null);
    try {
      const res = await fetch("/api/journey/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: curated.map((p) => p.fullName) }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (res.ok && data.narrative) {
        setNarrative(data.narrative);
        setEvidence(data.evidence ?? []);
        setPatterns(data.patterns ?? []);
        setWarnings(data.warnings ?? []);
        setGeneratedRepos(data.repos ?? []);
        setStatus("ready");
      } else if (res.status === 401) {
        setMessage("Your GitHub session expired. Reconnect GitHub and try again.");
        setStatus("error");
      } else {
        // 502 / 503 / 500: deterministic story, clearly labeled.
        setMessage(data.message ?? "The AI narrative is unavailable right now.");
        setStatus("degraded");
      }
    } catch {
      setMessage("A network error interrupted the journey generation.");
      setStatus("degraded");
    }
  }, [user.login]);

  useEffect(() => {
    void generate();
  }, [generate, attempt]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <header className="text-center">
        <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-full ring-2 ring-primary/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={deterministicStory.userAvatar} alt={deterministicStory.userLogin} className="h-full w-full object-cover" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {deterministicStory.userName}&apos;s Journey
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          @{deterministicStory.userLogin} · curated GitHub history, written as a story
        </p>
      </header>

      {/* Status banners */}
      {status === "loading" && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI narrative generating…
        </div>
      )}
      {status === "degraded" && (
        <div className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-amber-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Deterministic fallback — AI narrative unavailable
              {message ? ` (${message})` : ""}
            </span>
          </p>
          <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)} className="shrink-0 text-xs">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}
      {status === "error" && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{message ?? "Something went wrong."}</p>
          <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)} className="shrink-0 text-xs">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}
      {status === "ready" && narrative && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
          <Sparkles className="h-4 w-4" />
          AI narrative verified against {evidence.length} evidence {evidence.length === 1 ? "record" : "records"} —
          {narrative.verifiedClaimCount} claim{narrative.verifiedClaimCount === 1 ? "" : "s"} grounded,{" "}
          {narrative.droppedClaimCount} dropped by guardrails
        </div>
      )}

      {/* Empty state: no curated repositories yet */}
      {status === "empty" && (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookmarkCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold">No highlighted projects yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            There isn&apos;t enough evidence to write a journey yet — curate more repositories on the projects page.
          </p>
          <Link href="/projects">
            <Button className="mt-6">Curate my repositories</Button>
          </Link>
        </div>
      )}

      {/* Deterministic story: shown in-flight and as the labeled fallback */}
      {(status === "loading" || status === "degraded" || status === "error") && (
        <DeterministicStory story={deterministicStory} />
      )}

      {/* Guardrailed AI narrative */}
      {status === "ready" && narrative && (
        <>
          <Narrative narrative={narrative} evidence={evidence} />
          <EvidencePanel
            user={user}
            repos={generatedRepos}
            patterns={patterns}
            narrative={narrative}
            evidence={evidence}
            warnings={warnings}
          />
        </>
      )}
    </div>
  );
}

/** The deterministic story layout (same as the pre-AI journey page). */
function DeterministicStory({ story }: { story: JourneyStory }) {
  return (
    <>
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
    </>
  );
}