/**
 * Guardrail verification tests — the anti-hallucination gate.
 *
 * Every claim the LLM produced is checked deterministically against the
 * FULL evidence store before anything is returned to the user:
 *   - unknown evidence ids → claim dropped
 *   - claim that shares no content with its cited evidence (fabrication)
 *     → claim dropped
 *   - numbers / repo names / languages / years that do not appear in the
 *     cited evidence → claim flagged as unverified (survives with a note)
 * Chapters that end up with zero verified claims are replaced by a
 * deterministic evidence-summary chapter built from PatternFacts.
 */

import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "./evidence";
import type { PatternFact } from "./patterns";
import type { AiNarrative } from "./ai-journey";
import { verifyNarrative } from "./guardrails";

const FETCHED_AT = "2026-01-15T12:00:00Z";

function rec(partial: Partial<EvidenceRecord> & { id: string }): EvidenceRecord {
  return {
    source: "commit",
    repoFullName: "userA/repo-a",
    url: `https://github.com/userA/repo-a/commit/${partial.id}`,
    title: "Add login flow",
    detail: null,
    date: "2023-03-01T00:00:00Z",
    meta: { message: "Add login flow" },
    fetchedAt: FETCHED_AT,
    ...partial,
  };
}

function fixtureEvidence(): EvidenceRecord[] {
  return [
    rec({ id: "c1", date: "2023-03-01T00:00:00Z", title: "Add login flow", meta: { message: "Add login flow" } }),
    rec({
      id: "p1",
      source: "pull_request",
      title: "Add auth middleware",
      date: "2024-02-01T00:00:00Z",
      url: "https://github.com/userA/repo-a/pull/1",
      meta: { number: 1, state: "closed", merged: true },
    }),
    rec({
      id: "l1",
      source: "language",
      title: "TypeScript in userA/repo-a",
      date: "2025-06-01T00:00:00Z",
      meta: { languages: { TypeScript: 42 }, totalBytes: 42 },
    }),
  ];
}

function fixturePatterns(): PatternFact[] {
  return [
    {
      id: "timeline-0",
      label: "First activity",
      statement: "First activity: userA/repo-a, March 2023",
      evidenceIds: ["c1"],
      category: "timeline",
    },
  ];
}

function narrative(chapters: AiNarrative["chapters"]): AiNarrative {
  return { chapters, summary: "summary" };
}

describe("verifyNarrative", () => {
  it("passes fully grounded claims through as verified", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 1,
          title: "The beginning",
          kicker: "first line",
          claims: [{ text: "Started in March 2023 with login flow work.", evidenceIds: ["c1"] }],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].deterministic).toBeUndefined();
    expect(result.chapters[0].claims[0].verified).toBe(true);
    expect(result.verifiedClaimCount).toBe(1);
    expect(result.droppedClaimCount).toBe(0);
    expect(result.dropReasons).toEqual([]);
  });

  it("drops fabricated claims that share no content with their cited evidence", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 1,
          title: "Mobile",
          kicker: "app",
          claims: [{ text: "Built a mobile app with native SDKs.", evidenceIds: ["c1"] }],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.droppedClaimCount).toBe(1);
    expect(result.verifiedClaimCount).toBe(0);
    expect(result.chapters[0].claims).toEqual([]);
    expect(result.dropReasons.some((r) => r.includes("shares no content"))).toBe(true);
  });

  it("drops claims citing unknown evidence ids and records why", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 1,
          title: "t",
          kicker: "k",
          claims: [{ text: "Something about a ghost record.", evidenceIds: ["ghost-id"] }],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.droppedClaimCount).toBe(1);
    expect(result.dropReasons.some((r) => r.includes("ghost-id"))).toBe(true);
  });

  it("flags claims with numbers that do not appear in the cited evidence", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 1,
          title: "Stars",
          kicker: "k",
          // evidence says 42 (TypeScript bytes) — 3 is fabricated
          claims: [{ text: "The project reached 3 stars.", evidenceIds: ["l1"] }],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.droppedClaimCount).toBe(0);
    expect(result.verifiedClaimCount).toBe(0);
    expect(result.chapters[0].claims[0].verified).toBe(false);
  });

  it("flags repo names not present in the cited evidence", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 1,
          title: "t",
          kicker: "k",
          claims: [{ text: "The main work happened in userA/other-repo.", evidenceIds: ["c1"] }],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.chapters[0].claims[0].verified).toBe(false);
  });

  it("flags languages that are not present in the cited evidence", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 1,
          title: "t",
          kicker: "k",
          claims: [{ text: "Everything was written in Go.", evidenceIds: ["l1"] }],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.chapters[0].claims[0].verified).toBe(false);
  });

  it("flags years that do not appear in the cited evidence", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 1,
          title: "t",
          kicker: "k",
          // c1 is from 2023 — claiming 2024 activity is unsupported
          claims: [{ text: "In 2024 the first commit landed.", evidenceIds: ["c1"] }],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.chapters[0].claims[0].verified).toBe(false);
  });

  it("replaces a chapter with zero verified claims using deterministic PatternFacts", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 2,
          title: "Fabricated",
          kicker: "k",
          claims: [{ text: "Built a mobile app with native SDKs.", evidenceIds: ["c1"] }],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.chapters).toHaveLength(1);
    const chapter = result.chapters[0];
    expect(chapter.deterministic).toBe(true);
    expect(chapter.title).toBe("Evidence summary");
    expect(chapter.index).toBe(2);
    expect(chapter.claims.length).toBeGreaterThan(0);
    expect(chapter.claims[0].text).toBe(fixturePatterns()[0].statement);
    expect(chapter.claims[0].verified).toBe(true);
  });

  it("keeps verified claims when only some claims in a chapter are flagged", () => {
    const result = verifyNarrative(
      narrative([
        {
          index: 1,
          title: "Mixed",
          kicker: "k",
          claims: [
            { text: "Started in March 2023 with login flow work.", evidenceIds: ["c1"] },
            { text: "The project reached 3 stars.", evidenceIds: ["l1"] },
          ],
        },
      ]),
      fixtureEvidence(),
      fixturePatterns()
    );

    expect(result.chapters[0].deterministic).toBeUndefined();
    const [grounded, flagged] = result.chapters[0].claims;
    expect(grounded.verified).toBe(true);
    expect(flagged.verified).toBe(false);
    expect(result.verifiedClaimCount).toBe(1);
    expect(result.droppedClaimCount).toBe(0);
  });
});