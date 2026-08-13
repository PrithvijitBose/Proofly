/**
 * Journey export — machine-readable, self-contained bundle.
 *
 * Everything needed to reproduce the journey lives in one JSON document:
 * the narrative claims, the full evidence store they cite, the patterns,
 * and the repos they came from. "Self-contained claim resolution" means
 * every `claim.evidenceIds` entry must resolve to a record inside the
 * bundle's own `evidence` array — no external lookups required to verify
 * a claim after export.
 */

import type { GitHubUser } from "./client";
import type { CuratedProject } from "./curation";
import type { EvidenceRecord } from "./evidence";
import type { PatternFact } from "./patterns";
import type { GuardedClaim, GuardedNarrative } from "./guardrails";

export interface JourneyBundleInput {
  user: GitHubUser;
  repos: CuratedProject[];
  patterns: PatternFact[];
  narrative: GuardedNarrative;
  evidence: EvidenceRecord[];
  warnings: string[];
}

export interface JourneyBundle extends JourneyBundleInput {
  exportedAt: string;
}

/** Resolves a claim's citations against an evidence store (possibly empty). */
export function resolveClaimEvidence(
  claim: GuardedClaim,
  evidence: EvidenceRecord[]
): EvidenceRecord[] {
  const byId = new Map(evidence.map((record) => [record.id, record]));
  return claim.evidenceIds
    .map((id) => byId.get(id))
    .filter((record): record is EvidenceRecord => record !== undefined);
}

/**
 * Builds the export bundle. Throws when the narrative cites evidence that
 * is not part of the bundle — an exported file must never reference
 * records it does not contain.
 */
export function buildJourneyBundle(input: JourneyBundleInput): JourneyBundle {
  const unresolved: string[] = [];
  for (const chapter of input.narrative.chapters) {
    for (const claim of chapter.claims) {
      const resolved = resolveClaimEvidence(claim, input.evidence);
      if (resolved.length !== claim.evidenceIds.length) {
        const missing = claim.evidenceIds.filter(
          (id) => !input.evidence.some((record) => record.id === id)
        );
        unresolved.push(...missing);
      }
    }
  }
  if (unresolved.length > 0) {
    throw new Error(
      `Cannot export: narrative cites evidence missing from the bundle (${unresolved.join(", ")}).`
    );
  }

  return {
    ...input,
    exportedAt: new Date().toISOString(),
  };
}