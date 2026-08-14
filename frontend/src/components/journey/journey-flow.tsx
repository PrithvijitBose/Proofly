"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, ShieldAlert, Sparkles, BookmarkCheck, CheckCircle, Edit3, Award, RotateCcw } from "lucide-react";
import type { GitHubRepo, GitHubUser } from "@/lib/github/client";
import { buildJourneyStory, type JourneyStory } from "@/lib/github/journey";
import type { GuardedNarrative } from "@/lib/github/guardrails";
import type { EvidenceRecord } from "@/lib/github/evidence";
import type { PatternFact } from "@/lib/github/patterns";
import type { CuratedProject } from "@/lib/github/curation";
import { loadCuratedProjects } from "@/lib/github/curation";
import {
  loadApprovedJourney,
  saveApprovedJourney,
  clearApprovedJourney,
  type ApprovedJourney,
} from "@/lib/github/custom-journey";
import { Narrative } from "./narrative";
import { EvidencePanel } from "./evidence-panel";
import { JourneyCustomizer } from "./journey-customizer";
import { NarrativeEditor } from "./narrative-editor";
import { Button } from "@/components/ui/button";

type FlowStatus = "checking" | "empty" | "loading" | "ready" | "degraded" | "error";

/**
 * Maps curated projects (client-side metadata) to the repo shape the
 * deterministic story builder expects, so the fallback story covers the
 * same curated scope as the AI narrative.
 */
function curatedToRepos(projects: CuratedProject[]): GitHubRepo[] {
  return projects.map((p) => ({
    id: p.repoId,
    name: p.name,
    full_name: p.fullName,
    html_url: p.htmlUrl,
    description: p.description,
    language: p.language,
    stargazers_count: p.stargazersCount,
    forks_count: p.forksCount,
    pushed_at: p.pushedAt,
    created_at: p.createdAt ?? "",
    archived: false,
    fork: false,
  }));
}

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
  const [status, setStatus] = useState<FlowStatus>("loading");
  const [narrative, setNarrative] = useState<GuardedNarrative | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [patterns, setPatterns] = useState<PatternFact[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generatedRepos, setGeneratedRepos] = useState<CuratedProject[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [curatedStory, setCuratedStory] = useState<JourneyStory | null>(null);

  // Customization & Approval States
  const [tone, setTone] = useState<string>("Professional");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  const optionsRef = useRef({ tone, customPrompt });
  useEffect(() => {
    optionsRef.current = { tone, customPrompt };
  }, [tone, customPrompt]);

  const fetchGeneration = useCallback(
    async (options: { tone?: string; customPrompt?: string } = {}) => {
      const curated = loadCuratedProjects(user.login);
      if (curated.length === 0) {
        setStatus("empty");
        return;
      }
      setCuratedStory(buildJourneyStory(user, curatedToRepos(curated)));
      setMessage(null);

      const targetTone = options.tone ?? optionsRef.current.tone;
      const targetPrompt = options.customPrompt ?? optionsRef.current.customPrompt;

      try {
        const res = await fetch("/api/journey/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repos: curated.map((p) => p.fullName),
            tone: targetTone,
            customPrompt: targetPrompt,
          }),
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
          setMessage(data.message ?? "The AI narrative is unavailable right now.");
          setStatus("degraded");
        }
      } catch {
        setMessage("A network error interrupted the journey generation.");
        setStatus("degraded");
      }
    },
    [user]
  );

  // Initial Load: check for saved approved story first (runs only on mount per user)
  useEffect(() => {
    const approved = loadApprovedJourney(user.login);
    if (approved) {
      setNarrative(approved.narrative);
      setIsApproved(true);
      setSavedAt(approved.savedAt);
      if (approved.tone) setTone(approved.tone);
      if (approved.customPrompt) setCustomPrompt(approved.customPrompt);
      setStatus("ready");

      // Also gather evidence in background so citations stay interactive
      const curated = loadCuratedProjects(user.login);
      if (curated.length > 0) {
        setCuratedStory(buildJourneyStory(user, curatedToRepos(curated)));
        fetch(`/api/journey/evidence?repos=${encodeURIComponent(curated.map((p) => p.fullName).join(","))}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.evidence) setEvidence(d.evidence);
            if (d.repos) setGeneratedRepos(d.repos);
          })
          .catch(() => {});
      }
    } else {
      void fetchGeneration();
    }
  }, [user.login]);

  const handleRegenerate = async (options: { tone: string; customPrompt: string }) => {
    setTone(options.tone);
    setCustomPrompt(options.customPrompt);
    setIsRegenerating(true);
    setIsEditing(false);
    setIsApproved(false);
    await fetchGeneration(options);
    setIsRegenerating(false);
  };

  const handleSaveEdited = (editedNarrative: GuardedNarrative) => {
    const timestamp = new Date().toISOString();
    const approved: ApprovedJourney = {
      narrative: editedNarrative,
      isApproved: true,
      savedAt: timestamp,
      tone,
      customPrompt,
    };
    const ok = saveApprovedJourney(user.login, approved);
    if (!ok) {
      setMessage("Could not save your approved story to local storage. Check your browser storage settings.");
      return;
    }
    setNarrative(editedNarrative);
    setIsApproved(true);
    setSavedAt(timestamp);
    setIsEditing(false);
  };

  const handleApproveCurrent = () => {
    if (!narrative) return;
    const timestamp = new Date().toISOString();
    const approved: ApprovedJourney = {
      narrative,
      isApproved: true,
      savedAt: timestamp,
      tone,
      customPrompt,
    };
    const ok = saveApprovedJourney(user.login, approved);
    if (!ok) {
      setMessage("Could not save your approved story to local storage. Check your browser storage settings.");
      return;
    }
    setIsApproved(true);
    setSavedAt(timestamp);
  };

  const handleRevertToDraft = () => {
    clearApprovedJourney(user.login);
    setIsApproved(false);
    setSavedAt(null);
    setIsEditing(false);
    void fetchGeneration();
  };

  const story = curatedStory ?? deterministicStory;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <header className="text-center">
        <div className="mx-auto mb-6 h-20 w-20 overflow-hidden rounded-full ring-2 ring-primary/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.userAvatar} alt={story.userLogin} className="h-full w-full object-cover" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {story.userName}&apos;s Journey
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          @{story.userLogin} · curated GitHub history, written as a story
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
              Deterministic fallback — AI narrative unavailable. Showing the story for your curated repositories
              {message ? ` (${message})` : ""}
            </span>
          </p>
          <Button size="sm" variant="outline" onClick={() => fetchGeneration()} className="shrink-0 text-xs">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}
      {status === "error" && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{message ?? "Something went wrong."}</p>
          <Button size="sm" variant="outline" onClick={() => fetchGeneration()} className="shrink-0 text-xs">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}
      {status === "ready" && narrative && !isEditing && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm">
            {isApproved ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Approved Story Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-primary">
                <Sparkles className="h-4 w-4 text-primary" />
                AI-Generated Draft
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              · Grounded in {evidence.length} evidence records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isApproved ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs"
                >
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  Edit Draft
                </Button>
                <Button
                  size="sm"
                  onClick={handleApproveCurrent}
                  className="text-xs font-semibold shadow-sm"
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  Approve as Official Story
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs"
                >
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  Edit Story
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevertToDraft}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset to AI Draft
                </Button>
              </>
            )}
          </div>
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

      {/* Deterministic story fallback */}
      {(status === "loading" || status === "degraded" || status === "error") && (
        <DeterministicStory story={story} />
      )}

      {/* Interactive AI Narrative & Customizer */}
      {status === "ready" && narrative && (
        <div className="space-y-6">
          {/* Customization Toolbar */}
          {!isEditing && (
            <JourneyCustomizer
              currentTone={tone}
              currentPrompt={customPrompt}
              isGenerating={isRegenerating}
              onRegenerate={handleRegenerate}
            />
          )}

          {/* Manual Editor or Guardrailed View */}
          {isEditing ? (
            <NarrativeEditor
              initialNarrative={narrative}
              evidence={evidence}
              onSave={handleSaveEdited}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <Narrative
                narrative={narrative}
                evidence={evidence}
                isApproved={isApproved}
                savedAt={savedAt ?? undefined}
                onEdit={() => setIsEditing(true)}
              />
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