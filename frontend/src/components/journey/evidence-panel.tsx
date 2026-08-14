"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkCheck, Download, ExternalLink, Loader2, ShieldAlert, Database } from "lucide-react";
import type { GitHubUser } from "@/lib/github/client";
import type { CuratedProject } from "@/lib/github/curation";
import type { EvidenceRecord } from "@/lib/github/evidence";
import type { PatternFact } from "@/lib/github/patterns";
import type { GuardedNarrative } from "@/lib/github/guardrails";
import { Button } from "@/components/ui/button";

interface EvidencePanelProps {
  user: GitHubUser;
  repos: CuratedProject[];
  patterns: PatternFact[];
  narrative: GuardedNarrative;
  evidence: EvidenceRecord[];
  warnings: string[];
}

export function EvidencePanel({ user, repos, patterns, narrative, evidence, warnings }: EvidencePanelProps) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const citedIds = new Set<string>();
  for (const chapter of narrative.chapters) {
    for (const claim of chapter.claims) {
      for (const id of claim.evidenceIds) citedIds.add(id);
    }
  }

  const allClaims = narrative.chapters.flatMap((chapter) => chapter.claims);
  const verifiedCount = allClaims.filter((claim) => claim.verified).length;

  const byRepo = new Map<string, EvidenceRecord[]>();
  for (const record of evidence) {
    const list = byRepo.get(record.repoFullName) ?? [];
    list.push(record);
    byRepo.set(record.repoFullName, list);
  }

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/journey/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos, patterns, narrative, evidence, warnings }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setExportError(data?.message ?? "Export failed — try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `proofly-journey-${user.login}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Export failed — check your connection and try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="mt-14">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Evidence</h2>
          <span className="rounded-full border border-border/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {evidence.length} {evidence.length === 1 ? "record" : "records"}
          </span>
        </div>
        <Button size="sm" onClick={handleExport} disabled={exporting || evidence.length === 0}>
          {exporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
          {exporting ? "Exporting…" : "Export journey JSON"}
        </Button>
      </div>

      {exportError && <p className="mt-2 text-xs text-red-400">{exportError}</p>}

      {/* Guardrail summary line */}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
        {verifiedCount} of {allClaims.length} claims verified against GitHub evidence
      </p>

      {evidence.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookmarkCheck className="h-6 w-6" />
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
            Not enough evidence to write a journey yet — curate more repositories on the projects page.
          </p>
          <Link href="/projects">
            <Button variant="outline" className="mt-5 text-xs">
              Curate repositories
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {[...byRepo.entries()].map(([repoFullName, records]) => (
            <div key={repoFullName} className="rounded-2xl border border-border/50 bg-background/40 p-5">
              <a
                href={`https://github.com/${repoFullName}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary hover:underline"
              >
                {repoFullName}
                <ExternalLink className="h-3 w-3" />
              </a>
              <ul className="mt-3 space-y-1.5">
                {records.map((record) => {
                  const cited = citedIds.has(record.id);
                  return (
                    <li
                      key={record.id}
                      className={`flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                        cited ? "border-border/40 bg-background/60" : "border-dashed border-border/30 opacity-60"
                      }`}
                    >
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 font-mono uppercase tracking-wider text-muted-foreground">
                          {record.source}
                        </span>
                        <a
                          href={record.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-muted-foreground transition-colors hover:text-primary"
                          title={record.title}
                        >
                          {record.title}
                        </a>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!cited && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            not cited
                          </span>
                        )}
                        <a
                          href={record.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground transition-colors hover:text-primary"
                          aria-label={`Open ${record.title} on GitHub`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-6 space-y-1">
          {warnings.map((warning, i) => (
            <p key={i} className="text-xs text-amber-500/70">
              ⚠ {warning}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}