/**
 * Context-pack builder tests.
 *
 * The pack is token-bounded and deterministic: it never drops a pattern
 * without its evidence, and any truncation touches only excerpts — title
 * and url are never modified.
 */

import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "./evidence";
import { buildContextPack, DEFAULT_CONTEXT_TOKEN_BUDGET } from "./context-pack";
import type { PatternFact } from "./patterns";

const FETCHED_AT = "2026-01-15T12:00:00Z";

function rec(id: string, partial: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    id,
    source: "commit",
    repoFullName: "userA/repo-a",
    url: `https://github.com/userA/repo-a/commit/${id}`,
    title: `Commit ${id}`,
    detail: null,
    date: "2025-01-01T00:00:00Z",
    meta: {},
    fetchedAt: FETCHED_AT,
    ...partial,
  };
}

function mergedPr(id: string, date: string): EvidenceRecord {
  return rec(id, {
    source: "pull_request",
    title: `PR ${id}`,
    date,
    meta: { number: Number(id.slice(1)), state: "closed", merged: true },
  });
}

function langRecord(id: string, repoFullName: string): EvidenceRecord {
  return rec(id, {
    source: "language",
    repoFullName,
    title: `TypeScript in ${repoFullName}`,
    date: "2025-06-01T00:00:00Z",
    meta: { languages: { TypeScript: 1000 }, totalBytes: 1000 },
  });
}

describe("buildContextPack", () => {
  it("uses a single configurable token budget constant by default", () => {
    expect(DEFAULT_CONTEXT_TOKEN_BUDGET).toBe(8000);
    const evidence = [rec("c1"), rec("c2"), rec("c3")];
    const pack = buildContextPack(evidence, []);
    // Default budget is huge relative to tiny fixture → everything fits.
    expect(pack.evidencePack).toHaveLength(3);
    expect(pack.stats.estimatedTokens).toBeLessThanOrEqual(DEFAULT_CONTEXT_TOKEN_BUDGET);
    expect(pack.stats.truncated).toBe(false);
  });

  it("respects a small token budget with deterministic truncation", () => {
    const evidence = Array.from({ length: 30 }, (_, i) => rec(`c${i}`, { date: `2025-01-${(i % 28) + 1}T00:00:00Z` }));
    const pack = buildContextPack(evidence, [], { tokenBudget: 120 });

    expect(pack.evidencePack.length).toBeLessThan(evidence.length);
    expect(pack.stats.truncated).toBe(true);
    expect(pack.stats.estimatedTokens).toBeLessThanOrEqual(120);

    // Deterministic: same input → same pack.
    const again = buildContextPack(evidence, [], { tokenBudget: 120 });
    expect(JSON.stringify(pack)).toBe(JSON.stringify(again));
  });

  it("never truncates title or url — only excerpts", () => {
    const big = rec("big1", { title: "A title that must stay intact for citation", detail: "x".repeat(2000) });
    const evidence = [big, rec("c1"), rec("c2")];
    const pack = buildContextPack(evidence, [], { tokenBudget: 200 });

    for (const packed of pack.evidencePack) {
      const original = evidence.find((e) => e.id === packed.id)!;
      expect(packed.title).toBe(original.title);
      expect(packed.url).toBe(original.url);
      expect(packed.detail === null || packed.detail.length <= original.detail!.length).toBe(true);
    }
  });

  it("shortens only the detail excerpt when a record is otherwise too big", () => {
    const big = rec("big1", { title: "Keep me", detail: "y".repeat(4000) });
    const evidence = [big, rec("c1")];
    // Budget large enough for one record but not big's full detail.
    const pack = buildContextPack(evidence, [], { tokenBudget: 900 });

    const packedBig = pack.evidencePack.find((e) => e.id === "big1");
    expect(packedBig).toBeDefined();
    expect(packedBig!.detail!.length).toBeLessThan(4000);
    expect(packedBig!.title).toBe("Keep me");
    expect(packedBig!.url).toBe(big.url);
  });

  it("prioritizes merged PRs, then PRs, then non-trivial commits, then issues/events", () => {
    const evidence = [
      rec("c1", { date: "2025-01-02T00:00:00Z", title: "wip", meta: { message: "wip" } }),
      rec("c2", { date: "2025-01-03T00:00:00Z", title: "Implement real feature", meta: { message: "Implement the actual feature end to end" } }),
      mergedPr("p1", "2025-01-01T00:00:00Z"),
      rec("p2", { source: "pull_request", title: "Open PR", date: "2025-01-04T00:00:00Z", meta: { number: 2, state: "open", merged: false } }),
      rec("i1", { source: "issue", title: "Bug", date: "2025-01-05T00:00:00Z", meta: { number: 3, state: "open" } }),
      rec("e1", { source: "event", title: "Starred repo-a", date: "2025-01-06T00:00:00Z", meta: { type: "WatchEvent" } }),
    ];

    // Budget fits only the merged PR (~30 tokens; PR ~31).
    const tiny = buildContextPack(evidence, [], { tokenBudget: 50 });
    expect(tiny.evidencePack.map((e) => e.id)).toEqual(["p1"]);

    // Slightly larger: merged PR + unmerged PR + non-trivial commit, never trivial "wip".
    const medium = buildContextPack(evidence, [], { tokenBudget: 100 });
    const order = medium.evidencePack.map((e) => e.id);
    expect(order).toContain("p1");
    expect(order).toContain("c2");
    expect(order.indexOf("c1")).toBe(-1); // trivial commit dropped in favor of real content
  });

  it("keeps every PatternFact's evidence inside the pack (no orphan facts)", () => {
    const evidence = [
      rec("c1", { date: "2024-03-01T00:00:00Z", title: "first", meta: { message: "First commit ever made here" } }),
      rec("c2", { date: "2025-01-01T00:00:00Z", title: "second", meta: { message: "Another commit" } }),
      langRecord("l1", "userA/repo-a"),
    ];
    const patterns: PatternFact[] = [
      { id: "f1", label: "First activity", statement: "First activity in March 2024", evidenceIds: ["c1"], category: "timeline" },
      { id: "f2", label: "Languages", statement: "TypeScript dominant", evidenceIds: ["l1"], category: "language_evolution" },
    ];

    const pack = buildContextPack(evidence, patterns, { tokenBudget: 300 });
    const packedIds = new Set(pack.evidencePack.map((e) => e.id));
    for (const fact of pack.patterns) {
      expect(fact.evidenceIds.every((id) => packedIds.has(id))).toBe(true);
    }
    // The pattern-backed evidence (c1, l1) must be present even if optional c2 is crowded out.
    expect(packedIds.has("c1")).toBe(true);
    expect(packedIds.has("l1")).toBe(true);
  });

  it("drops patterns whose evidence could not fit the budget instead of orphaning them", () => {
    const evidence = Array.from({ length: 40 }, (_, i) => rec(`c${i}`));
    const patterns: PatternFact[] = [
      { id: "f-early", label: "Early", statement: "Refers to the very first commit", evidenceIds: ["c0"], category: "timeline" },
      { id: "f-late", label: "Late", statement: "Refers to the last commit", evidenceIds: ["c39"], category: "timeline" },
    ];
    const pack = buildContextPack(evidence, patterns, { tokenBudget: 60 });
    for (const fact of pack.patterns) {
      const packedIds = new Set(pack.evidencePack.map((e) => e.id));
      expect(fact.evidenceIds.every((id) => packedIds.has(id))).toBe(true);
    }
  });

  it("returns an empty pack for empty evidence", () => {
    const pack = buildContextPack([], []);
    expect(pack.patterns).toEqual([]);
    expect(pack.evidencePack).toEqual([]);
    expect(pack.stats.totalEvidence).toBe(0);
    expect(pack.stats.truncated).toBe(false);
  });
});