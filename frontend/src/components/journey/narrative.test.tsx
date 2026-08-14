/**
 * Narrative component tests — the cited, guardrailed AI story.
 *
 * Covers: chapter rendering, verified / needs-verification badges, flagged
 * reasons, citation chips linking to real GitHub URLs, chip capping,
 * deterministic (evidence-derived) chapters, and the records footer.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Narrative, MAX_CITATION_CHIPS, citationLabel } from "./narrative";
import type { EvidenceRecord } from "@/lib/github/evidence";
import type { GuardedNarrative } from "@/lib/github/guardrails";

const FETCHED_AT = "2026-01-15T12:00:00Z";

const commitRecord: EvidenceRecord = {
  id: "commit:userA/repo-a:abc1234",
  source: "commit",
  repoFullName: "userA/repo-a",
  url: "https://github.com/userA/repo-a/commit/abc1234",
  title: "Add login flow",
  detail: null,
  date: "2023-03-01T00:00:00Z",
  meta: { sha: "abc1234", message: "Add login flow" },
  fetchedAt: FETCHED_AT,
};

const prRecord: EvidenceRecord = {
  id: "pull_request:userA/repo-a:1",
  source: "pull_request",
  repoFullName: "userA/repo-a",
  url: "https://github.com/userA/repo-a/pull/1",
  title: "Add auth middleware",
  detail: null,
  date: "2024-02-01T00:00:00Z",
  meta: { number: 1, state: "closed", merged: true },
  fetchedAt: FETCHED_AT,
};

const languageRecord: EvidenceRecord = {
  id: "language:userA/repo-a:languages",
  source: "language",
  repoFullName: "userA/repo-a",
  url: "https://github.com/userA/repo-a",
  title: "TypeScript in userA/repo-a",
  detail: null,
  date: "2025-06-01T00:00:00Z",
  meta: { languages: { TypeScript: 42 }, totalBytes: 42 },
  fetchedAt: FETCHED_AT,
};

const evidence = [commitRecord, prRecord, languageRecord];

function narrative(partial: Partial<GuardedNarrative> = {}): GuardedNarrative {
  return {
    chapters: [
      {
        index: 1,
        title: "The beginning",
        kicker: "first line",
        claims: [
          {
            text: "Started in March 2023 with login flow work.",
            evidenceIds: ["commit:userA/repo-a:abc1234", "pull_request:userA/repo-a:1"],
            verified: true,
          },
          {
            text: "The project reached 3 stars.",
            evidenceIds: ["language:userA/repo-a:languages"],
            verified: false,
            flagged: ["number 3 does not appear in the cited evidence"],
          },
        ],
      },
    ],
    verifiedClaimCount: 1,
    droppedClaimCount: 0,
    dropReasons: [],
    ...partial,
  };
}

describe("citationLabel", () => {
  it("labels commits with their short sha", () => {
    expect(citationLabel(commitRecord)).toBe("commit abc1234");
  });

  it("labels pull requests and issues with their number", () => {
    expect(citationLabel(prRecord)).toBe("PR #1");
  });
});

describe("Narrative", () => {
  it("renders chapters with kicker, title and claim text", () => {
    render(<Narrative narrative={narrative()} evidence={evidence} />);
    expect(screen.getByText("first line")).toBeTruthy();
    expect(screen.getByText("The beginning")).toBeTruthy();
    expect(screen.getByText("Started in March 2023 with login flow work.")).toBeTruthy();
  });

  it("marks verified claims and flags unverifiable ones with their reason", () => {
    render(<Narrative narrative={narrative()} evidence={evidence} />);
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(screen.getByText("Needs verification")).toBeTruthy();
    expect(screen.getByText("number 3 does not appear in the cited evidence")).toBeTruthy();
  });

  it("renders citation chips that link to the real GitHub record", () => {
    render(<Narrative narrative={narrative()} evidence={evidence} />);
    const chip = screen.getByText("commit abc1234");
    expect(chip.closest("a")?.getAttribute("href")).toBe(commitRecord.url);
    expect(screen.getByText("PR #1").closest("a")?.getAttribute("href")).toBe(prRecord.url);
  });

  it("caps citation chips per claim and shows the overflow count", () => {
    const manyIds = Array.from({ length: MAX_CITATION_CHIPS + 2 }, (_, i) => `commit:userA/repo-a:extra${i}`);
    const manyRecords = evidence.concat(
      manyIds.map((id, i) => ({
        ...commitRecord,
        id,
        url: `https://github.com/userA/repo-a/commit/extra${i}`,
      }))
    );
    render(
      <Narrative
        narrative={narrative({
          chapters: [
            {
              index: 1,
              title: "t",
              kicker: "k",
              claims: [{ text: "Many commits.", evidenceIds: manyIds, verified: true }],
            },
          ],
        })}
        evidence={manyRecords}
      />
    );
    const chips = screen.getAllByRole("link");
    expect(chips.length).toBe(MAX_CITATION_CHIPS);
    expect(screen.getByText("+2 more")).toBeTruthy();
  });

  it("renders deterministic replacement chapters without claim badges", () => {
    render(
      <Narrative
        narrative={narrative({
          chapters: [
            {
              index: 2,
              title: "Evidence summary",
              kicker: "verified facts from your GitHub history",
              deterministic: true,
              claims: [
                { text: "First activity: userA/repo-a, March 2023", evidenceIds: ["commit:userA/repo-a:abc1234"], verified: true },
              ],
            },
          ],
        })}
        evidence={evidence}
      />
    );
    expect(screen.getByText("Evidence-derived")).toBeTruthy();
    expect(screen.getByText("First activity: userA/repo-a, March 2023")).toBeTruthy();
    expect(screen.queryByText("Verified")).toBeNull();
  });

  it("shows a footer counting unique cited evidence records", () => {
    render(<Narrative narrative={narrative()} evidence={evidence} />);
    expect(screen.getByText("Generated from 3 evidence records")).toBeTruthy();
  });
});