"use client";

import { CheckCircle2, ShieldAlert, FileText, ExternalLink } from "lucide-react";
import type { GuardedNarrative } from "@/lib/github/guardrails";
import type { EvidenceRecord } from "@/lib/github/evidence";

/** Maximum citation chips rendered per claim (links stay in the record). */
export const MAX_CITATION_CHIPS = 5;

interface NarrativeProps {
  narrative: GuardedNarrative;
  evidence: EvidenceRecord[];
}

/** Short human label for an evidence record's citation chip. */
export function citationLabel(record: EvidenceRecord): string {
  switch (record.source) {
    case "commit": {
      const sha = typeof record.meta.sha === "string" ? record.meta.sha : "";
      return `commit ${sha.slice(0, 7) || "…"}`;
    }
    case "pull_request": {
      const number = typeof record.meta.number === "number" ? record.meta.number : "?";
      return `PR #${number}`;
    }
    case "issue": {
      const number = typeof record.meta.number === "number" ? record.meta.number : "?";
      return `issue #${number}`;
    }
    case "language":
      return "languages";
    case "event":
      return "event";
  }
}

export function Narrative({ narrative, evidence }: NarrativeProps) {
  const byId = new Map(evidence.map((record) => [record.id, record]));

  const citedIds = new Set<string>();
  for (const chapter of narrative.chapters) {
    for (const claim of chapter.claims) {
      for (const id of claim.evidenceIds) citedIds.add(id);
    }
  }
  const citedRecordCount = [...citedIds].filter((id) => byId.has(id)).length;

  return (
    <div>
      {narrative.chapters.map((chapter) => (
        <article
          key={chapter.index}
          className="relative rounded-2xl border border-border/50 bg-background/40 p-6 backdrop-blur-sm"
        >
          <div className="absolute -left-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground sm:flex">
            {chapter.index}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{chapter.kicker}</p>
            {chapter.deterministic && (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                <FileText className="h-3 w-3" />
                Evidence-derived
              </span>
            )}
          </div>
          <h3 className="mt-1 text-xl font-bold">{chapter.title}</h3>

          {chapter.deterministic ? (
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {chapter.claims.map((claim, i) => (
                <p key={i}>{claim.text}</p>
              ))}
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {chapter.claims.map((claim, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="flex-1 text-muted-foreground">{claim.text}</p>
                    {claim.verified ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        <ShieldAlert className="h-3 w-3" />
                        Needs verification
                      </span>
                    )}
                  </div>

                  {claim.flagged && claim.flagged.length > 0 && (
                    <p className="mt-1 text-xs italic text-amber-500/80">
                      {claim.flagged[0]}
                      {claim.flagged.length > 1 ? ` (+${claim.flagged.length - 1} more)` : ""}
                    </p>
                  )}

                  {claim.evidenceIds.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {claim.evidenceIds.slice(0, MAX_CITATION_CHIPS).map((id) => {
                        const record = byId.get(id);
                        if (!record) return null;
                        return (
                          <a
                            key={id}
                            href={record.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            {citationLabel(record)}
                          </a>
                        );
                      })}
                      {claim.evidenceIds.length > MAX_CITATION_CHIPS && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          +{claim.evidenceIds.length - MAX_CITATION_CHIPS} more
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}

      <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
        Generated from {citedRecordCount} evidence {citedRecordCount === 1 ? "record" : "records"}
      </p>
    </div>
  );
}