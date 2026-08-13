/**
 * Guardrail verification — the anti-hallucination gate.
 *
 * Runs deterministically, server-side, after the LLM narrative comes back
 * and BEFORE anything is returned to the user. Every claim is checked
 * against the FULL evidence store (not the context pack):
 *
 *   - unknown evidence ids            → claim DROPPED
 *   - no content overlap with cited evidence AND no numbers
 *     (pure fabrication)              → claim DROPPED
 *   - numbers / repos / languages /
 *     years missing from cited
 *     evidence                        → claim FLAGGED (verified: false,
 *                                       survives so the user sees the
 *                                       note, but never as verified)
 *
 * A chapter whose claims all end up dropped is REPLACED by a deterministic
 * evidence-summary chapter built from PatternFacts — the user always gets
 * grounded content, never raw LLM text.
 */

import type { EvidenceRecord } from "./evidence";
import type { PatternFact } from "./patterns";
import type { AiNarrative, NarrativeClaim } from "./ai-journey";

export interface GuardedClaim extends NarrativeClaim {
  verified: boolean;
  /** Reasons this claim was flagged (unverifiable), if any. */
  flagged?: string[];
}

export interface GuardedChapter {
  index: number;
  title: string;
  kicker: string;
  claims: GuardedClaim[];
  /** True when this chapter was replaced by the deterministic evidence summary. */
  deterministic?: boolean;
}

export interface GuardedNarrative {
  chapters: GuardedChapter[];
  verifiedClaimCount: number;
  droppedClaimCount: number;
  dropReasons: string[];
}

/** Languages the entity check understands (token-matched, case-insensitive). */
const KNOWN_LANGUAGES = [
  "typescript", "javascript", "python", "go", "rust", "java", "c", "c++",
  "csharp", "ruby", "php", "swift", "kotlin", "dart", "elixir", "erlang",
  "scala", "haskell", "lua", "perl", "r", "shell", "bash", "html", "css",
  "sql", "vue", "svelte", "solidity", "zig",
];

/** Words that carry no content signal for the fabrication check. */
const STOPWORDS = new Set([
  "with", "from", "that", "this", "your", "were", "have", "been", "they",
  "them", "their", "there", "about", "would", "could", "should", "after",
  "before", "between", "during", "using", "used", "built", "made", "came",
  "took", "make", "when", "then", "what", "which", "while", "still", "just",
  "very", "over", "more", "most", "other", "some", "such", "only", "also",
  "into", "than", "then", "were", "first", "work", "works", "project",
  "projects", "started", "began", "years", "year", "months", "month", "days",
  "day", "time", "times", "things", "thing", "code", "codes", "the", "and",
  "was", "for", "our", "his", "her", "its", "had", "did", "has", "not",
  "but", "are", "out", "off", "one", "two", "all", "can", "may", "new",
  "via", "per", "etc", "yet", "next", "last", "same", "such",
]);

/** Standalone numbers in a piece of text (not digits inside other words). */
function standaloneNumbers(text: string): string[] {
  const matches = text.match(/(?<!\d)\d+(?!\d)/g);
  return matches ?? [];
}

/** Content tokens: lowercase words of >= 4 chars, numbers and stopwords removed. */
function contentTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 4) continue;
    if (/^\d+$/.test(raw)) continue; // numbers are checked separately
    if (STOPWORDS.has(raw)) continue;
    tokens.add(raw);
  }
  return tokens;
}

/** Everything a claim can legitimately reference from one evidence record. */
function serializeEvidenceText(record: EvidenceRecord): string {
  const meta = JSON.stringify(record.meta ?? {});
  return `${record.repoFullName} ${record.title} ${record.detail ?? ""} ${record.date} ${meta}`.toLowerCase();
}

interface ClaimVerdict {
  status: "verified" | "flagged" | "dropped";
  reasons?: string[];
}

function verifyClaim(claim: NarrativeClaim, byId: Map<string, EvidenceRecord>): ClaimVerdict {
  // Rule 1: every cited id must resolve against the FULL evidence store.
  const resolved = claim.evidenceIds.map((id) => byId.get(id));
  if (resolved.some((record) => record === undefined)) {
    const missing = claim.evidenceIds.filter((id) => !byId.has(id));
    return { status: "dropped", reasons: [`cites unknown evidence id(s): ${missing.join(", ")}`] };
  }
  const records = resolved as EvidenceRecord[];

  const evidenceText = records.map(serializeEvidenceText).join(" ");
  const evidenceTokens = contentTokens(evidenceText);
  const claimNumbers = standaloneNumbers(claim.text);

  // Rule 2: pure fabrication — the claim shares no content with its cited
  // evidence AND cites no numbers (numbered claims fall through to the
  // numeric cross-check, which flags rather than drops).
  const claimTokens = contentTokens(claim.text);
  const overlap = [...claimTokens].filter((token) => evidenceTokens.has(token));
  if (overlap.length === 0 && claimNumbers.length === 0) {
    return {
      status: "dropped",
      reasons: ["shares no content with its cited evidence (possible fabrication)"],
    };
  }

  const problems: string[] = [];

  // Rule 3: every number in the claim must appear in the cited evidence.
  const evidenceNumbers = new Set(standaloneNumbers(evidenceText));
  for (const number of claimNumbers) {
    if (!evidenceNumbers.has(number)) {
      problems.push(`number ${number} does not appear in the cited evidence`);
    }
  }

  // Rule 4: repo mentions (owner/name) must be among the cited repos.
  const citedRepos = new Set(records.map((record) => record.repoFullName));
  const repoMentions = claim.text.match(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g) ?? [];
  for (const mention of repoMentions) {
    if (!citedRepos.has(mention)) {
      problems.push(`repo ${mention} does not appear in the cited evidence`);
    }
  }

  // Rule 5: language mentions must be among the cited evidence languages.
  const citedLanguages = new Set<string>();
  for (const record of records) {
    if (record.source === "language" && record.meta.languages) {
      for (const language of Object.keys(record.meta.languages as Record<string, number>)) {
        citedLanguages.add(language.toLowerCase());
      }
    }
  }
  const claimLower = claim.text.toLowerCase();
  const claimTokensLower = new Set(claimLower.split(/[^a-z0-9+]+/));
  for (const language of KNOWN_LANGUAGES) {
    if (claimTokensLower.has(language) && !citedLanguages.has(language)) {
      problems.push(`language ${language} does not appear in the cited evidence`);
    }
  }

  // Rule 6: years mentioned must appear among the cited evidence years.
  const citedYears = new Set(records.map((record) => new Date(record.date).getUTCFullYear()));
  const yearMentions = claim.text.match(/\b(19|20)\d{2}\b/g) ?? [];
  for (const year of yearMentions) {
    if (!citedYears.has(Number(year))) {
      problems.push(`year ${year} does not appear in the cited evidence`);
    }
  }

  if (problems.length > 0) return { status: "flagged", reasons: problems };
  return { status: "verified" };
}

/** Deterministic evidence-summary chapter built from engine-derived PatternFacts. */
export function buildEvidenceSummaryChapter(index: number, patterns: PatternFact[]): GuardedChapter {
  return {
    index,
    title: "Evidence summary",
    kicker: "verified facts from your GitHub history",
    deterministic: true,
    claims: patterns.map((fact) => ({
      text: fact.statement,
      evidenceIds: fact.evidenceIds,
      verified: true,
    })),
  };
}

export function verifyNarrative(
  narrative: AiNarrative,
  evidence: EvidenceRecord[],
  patterns: PatternFact[]
): GuardedNarrative {
  const byId = new Map(evidence.map((record) => [record.id, record]));

  const chapters: GuardedChapter[] = [];
  let verifiedClaimCount = 0;
  let droppedClaimCount = 0;
  const dropReasons: string[] = [];

  for (const chapter of narrative.chapters) {
    const claims: GuardedClaim[] = [];
    for (const claim of chapter.claims) {
      const verdict = verifyClaim(claim, byId);
      if (verdict.status === "dropped") {
        droppedClaimCount += 1;
        dropReasons.push(
          `chapter ${chapter.index}: "${truncate(claim.text, 60)}" — ${(verdict.reasons ?? []).join("; ")}`
        );
      } else if (verdict.status === "flagged") {
        claims.push({ ...claim, verified: false, flagged: verdict.reasons });
      } else {
        claims.push({ ...claim, verified: true });
        verifiedClaimCount += 1;
      }
    }

    const verifiedInChapter = claims.filter((claim) => claim.verified).length;
    if (verifiedInChapter === 0) {
      // Nothing grounded survived (all claims dropped or all flagged) —
      // replace the whole chapter so the user always receives
      // evidence-derived content.
      chapters.push(buildEvidenceSummaryChapter(chapter.index, patterns));
    } else {
      chapters.push({ ...chapter, claims });
    }
  }

  return { chapters, verifiedClaimCount, droppedClaimCount, dropReasons };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}