/**
 * Context-pack builder: the exact slice of evidence handed to the LLM.
 *
 * Token-bounded (one configurable budget constant), deterministic, and
 * self-consistent: every PatternFact shipped in the pack has all of its
 * evidence inside the pack — an LLM can never be asked to cite evidence it
 * cannot see. Truncation only ever shortens detail excerpts; titles and
 * URLs are never modified, so citations stay resolvable.
 *
 * The guardrail pass (Task 3.2) verifies the LLM's claims against the FULL
 * evidence store, not this pack.
 */

import type { EvidenceRecord } from "./evidence";
import type { PatternFact } from "./patterns";

export const DEFAULT_CONTEXT_TOKEN_BUDGET = 8000;

export interface ContextPack {
  patterns: PatternFact[];
  evidencePack: EvidenceRecord[];
  stats: {
    totalEvidence: number;
    packedEvidence: number;
    truncated: boolean;
    estimatedTokens: number;
  };
}

export interface ContextPackOptions {
  /** Token budget for the packed evidence + pattern statements. Default 8000. */
  tokenBudget?: number;
}

const TRIVIAL_COMMIT_RE =
  /^(Merge |wip|chore(\(|:)|docs(\(|:)|fix typo|update .*readme|bump |release v?|refactor: noop|revert )/i;

function isTrivialCommit(record: EvidenceRecord): boolean {
  const message = typeof record.meta.message === "string" ? record.meta.message : record.title;
  return message.length < 20 || TRIVIAL_COMMIT_RE.test(message);
}

/** Priority tier — lower is more valuable to the narrative. */
function tier(record: EvidenceRecord): number {
  switch (record.source) {
    case "pull_request":
      return record.meta.merged === true ? 0 : 1;
    case "commit":
      return isTrivialCommit(record) ? 3 : 2;
    case "issue":
      return 4;
    case "event":
      return 5;
    case "language":
      return 6;
    default:
      return 7;
  }
}

/** Meta kept in the pack view — heavy fields (full messages) stay in the full store. */
function packView(record: EvidenceRecord): EvidenceRecord {
  const meta: Record<string, unknown> = {};
  if (record.source === "pull_request" || record.source === "issue") {
    meta.number = record.meta.number;
    meta.state = record.meta.state;
    if (record.source === "pull_request") meta.merged = record.meta.merged;
  }
  if (record.source === "language") {
    meta.languages = record.meta.languages;
    meta.totalBytes = record.meta.totalBytes;
  }
  return { ...record, meta };
}

/** Rough token estimate: ~4 chars per token over the serialized content. */
export function estimateTokens(record: EvidenceRecord): number {
  const metaText = JSON.stringify(record.meta ?? {});
  const chars = record.title.length + (record.url?.length ?? 0) + (record.detail?.length ?? 0) + metaText.length;
  return Math.ceil(chars / 4) + 8;
}

/** Shrinks the detail excerpt (never title/url) to fit `remaining` tokens. */
function fitWithinBudget(
  record: EvidenceRecord,
  remaining: number
): { record: EvidenceRecord; tokens: number } | null {
  const view = packView(record);
  const full = estimateTokens(view);
  if (full <= remaining) return { record: view, tokens: full };
  if (!view.detail) return null;

  let detail = view.detail;
  while (detail.length > 40) {
    detail = detail.slice(0, Math.floor(detail.length / 2));
    const trial = { ...view, detail };
    const t = estimateTokens(trial);
    if (t <= remaining) return { record: trial, tokens: t };
  }
  return null;
}

/**
 * Builds the context pack for a set of evidence and patterns.
 *
 * Deterministic ordering: patterns' required evidence first (so facts are
 * never orphaned), then the rest, both ordered by narrative value (merged
 * PRs → PRs → non-trivial commits → issues → events → languages) and
 * recency. Records are greedily added until the budget is spent; patterns
 * whose evidence could not fit are dropped from the pack.
 */
export function buildContextPack(
  evidence: EvidenceRecord[],
  patterns: PatternFact[],
  opts: ContextPackOptions = {}
): ContextPack {
  const budget = opts.tokenBudget ?? DEFAULT_CONTEXT_TOKEN_BUDGET;

  const byId = new Map(evidence.map((e) => [e.id, e]));
  const requiredIds = new Set<string>();
  for (const pattern of patterns) {
    for (const id of pattern.evidenceIds) {
      if (byId.has(id)) requiredIds.add(id);
    }
  }

  const comparator = (a: EvidenceRecord, b: EvidenceRecord): number =>
    tier(a) - tier(b) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id);

  const sorted = [...evidence].sort(comparator);
  const ordered = [
    ...sorted.filter((e) => requiredIds.has(e.id)),
    ...sorted.filter((e) => !requiredIds.has(e.id)),
  ];

  const pack: EvidenceRecord[] = [];
  let tokens = 0;
  let truncated = false;

  for (const record of ordered) {
    const fitted = fitWithinBudget(record, budget - tokens);
    if (!fitted) {
      truncated = true;
      continue;
    }
    pack.push(fitted.record);
    tokens += fitted.tokens;
  }

  const packedIds = new Set(pack.map((e) => e.id));
  const packedPatterns = patterns.filter((p) => p.evidenceIds.every((id) => packedIds.has(id)));

  return {
    patterns: packedPatterns,
    evidencePack: pack,
    stats: {
      totalEvidence: evidence.length,
      packedEvidence: pack.length,
      truncated,
      estimatedTokens: tokens,
    },
  };
}