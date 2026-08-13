/**
 * Pattern engine tests.
 *
 * The engine is pure and deterministic: same evidence in, same facts out,
 * every fact's evidenceIds must resolve to real evidence records, and
 * nothing is ever guessed. Language-evolution facts must derive from
 * language byte counts + commit dates — not repo metadata.
 */

import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "./evidence";
import type { CuratedProject } from "./curation";
import { analyzePatterns } from "./patterns";
import type { PatternFact } from "./patterns";

const FETCHED_AT = "2026-01-15T12:00:00Z";
const REPO_A = "userA/repo-a";
const REPO_B = "userA/repo-b";

function rec(partial: Partial<EvidenceRecord> & { id: string }): EvidenceRecord {
  return {
    source: "commit",
    repoFullName: REPO_A,
    url: `https://github.com/${REPO_A}`,
    title: "title",
    detail: null,
    date: "2024-01-01T00:00:00Z",
    meta: {},
    fetchedAt: FETCHED_AT,
    ...partial,
  };
}

/** 16-record fixture covering commits, PRs, issues, languages and events. */
function fixture(): EvidenceRecord[] {
  return [
    // Commits — 2023: repo-a; 2024: repo-a ×3 + repo-b; 2025: repo-a ×2 + repo-b ×3
    rec({ id: "c1", repoFullName: REPO_A, date: "2023-03-01T00:00:00Z", title: "Add login flow", meta: { message: "Add login flow" } }),
    rec({ id: "c2", repoFullName: REPO_A, date: "2024-01-15T00:00:00Z", title: "Build REST endpoints", meta: { message: "Build REST endpoints" } }),
    rec({ id: "c3", repoFullName: REPO_A, date: "2024-06-01T00:00:00Z", title: "Style the dashboard", meta: { message: "Style the dashboard" } }),
    rec({ id: "c4", repoFullName: REPO_A, date: "2025-02-10T00:00:00Z", title: "Add database migrations", meta: { message: "Add database migrations" } }),
    rec({ id: "c5", repoFullName: REPO_A, date: "2025-02-11T00:00:00Z", title: "Auth token refresh", meta: { message: "Auth token refresh" } }),
    rec({ id: "c6", repoFullName: REPO_B, date: "2024-04-20T00:00:00Z", title: "Deploy with docker", meta: { message: "Deploy with docker" } }),
    rec({ id: "c7", repoFullName: REPO_B, date: "2025-07-01T00:00:00Z", title: "Fix API pagination", meta: { message: "Fix API pagination" } }),
    rec({ id: "c8", repoFullName: REPO_A, date: "2024-08-01T00:00:00Z", title: "Improve API error handling", meta: { message: "Improve API error handling" } }),
    rec({ id: "c9", repoFullName: REPO_B, date: "2025-07-02T00:00:00Z", title: "Python data pipeline", meta: { message: "Python data pipeline" } }),
    rec({ id: "c10", repoFullName: REPO_B, date: "2025-07-03T00:00:00Z", title: "Process data with pandas", meta: { message: "Process data with pandas" } }),
    // Pull requests
    rec({ id: "p1", source: "pull_request", repoFullName: REPO_A, date: "2024-02-01T00:00:00Z", title: "Add auth middleware", meta: { number: 1, state: "closed", merged: true } }),
    rec({ id: "p2", source: "pull_request", repoFullName: REPO_B, date: "2025-03-01T00:00:00Z", title: "Query optimization", meta: { number: 2, state: "closed", merged: true } }),
    rec({ id: "p3", source: "pull_request", repoFullName: REPO_B, date: "2025-04-01T00:00:00Z", title: "Add retry logic", meta: { number: 3, state: "closed", merged: true } }),
    // Issue
    rec({ id: "i1", source: "issue", repoFullName: REPO_A, date: "2024-05-01T00:00:00Z", title: "UI polish needed", meta: { number: 5, state: "open" } }),
    // Languages — repo-a: TypeScript dominant; repo-b: Python dominant
    rec({ id: "l1", source: "language", repoFullName: REPO_A, date: "2025-06-01T00:00:00Z", title: "TypeScript in userA/repo-a", meta: { languages: { TypeScript: 1000, Python: 500 }, totalBytes: 1500 } }),
    rec({ id: "l2", source: "language", repoFullName: REPO_B, date: "2025-06-01T00:00:00Z", title: "Python in userA/repo-b", meta: { languages: { Python: 9000, Go: 100 }, totalBytes: 9100 } }),
    // Event
    rec({ id: "e1", source: "event", repoFullName: REPO_A, date: "2024-03-01T00:00:00Z", title: "Pushed 1 commit to repo-a", meta: { type: "PushEvent" } }),
  ];
}

function curatedRepos(): CuratedProject[] {
  return [
    {
      repoId: 1, name: "repo-a", fullName: REPO_A, htmlUrl: `https://github.com/${REPO_A}`,
      description: null, language: "Python", // repo metadata says Python — byte counts must win
      stargazersCount: 42, forksCount: 5, pushedAt: "2026-01-01T00:00:00Z", customNote: "", priority: 1,
    },
    {
      repoId: 2, name: "repo-b", fullName: REPO_B, htmlUrl: `https://github.com/${REPO_B}`,
      description: null, language: "Go", stargazersCount: 3, forksCount: 0,
      pushedAt: "2026-01-01T00:00:00Z", customNote: "", priority: 2,
    },
  ];
}

describe("analyzePatterns", () => {
  it("produces facts in all 5 categories and every evidenceId resolves to a fixture record", () => {
    const facts = analyzePatterns(fixture(), curatedRepos());
    const categories = new Set(facts.map((f) => f.category));
    expect(categories).toEqual(new Set(["timeline", "language_evolution", "focus_areas", "cadence", "impact"]));

    const idSet = new Set(fixture().map((e) => e.id));
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      expect(fact.evidenceIds.length).toBeGreaterThan(0);
      for (const id of fact.evidenceIds) {
        expect(idSet.has(id)).toBe(true);
      }
    }
  });

  it("derives timeline facts from activity records", () => {
    const facts = analyzePatterns(fixture(), curatedRepos());
    const timeline = facts.filter((f) => f.category === "timeline");

    const first = timeline.find((f) => f.label === "First activity");
    expect(first).toBeDefined();
    expect(first!.statement).toContain("March 2023");
    expect(first!.evidenceIds).toContain("c1");

    const mostActive = timeline.find((f) => f.label === "Most active year");
    expect(mostActive).toBeDefined();
    expect(mostActive!.statement).toContain("2024");
    expect(mostActive!.statement).toContain("4");
    // Every id in the fact belongs to a 2024 commit.
    expect(mostActive!.evidenceIds.sort()).toEqual(["c2", "c3", "c6", "c8"]);
  });

  it("uses language byte counts + commit dates for evolution, not repo metadata", () => {
    const facts = analyzePatterns(fixture(), curatedRepos());
    const evolution = facts.filter((f) => f.category === "language_evolution");

    // repo-a's repo metadata says "Python" but its byte counts say TypeScript
    // dominant — the facts must follow the byte counts.
    const year2023 = evolution.find((f) => f.label === "2023");
    expect(year2023).toBeDefined();
    expect(year2023!.statement).toContain("TypeScript");
    expect(year2023!.statement).not.toContain("Python");
    expect(year2023!.evidenceIds).toContain("l1");
    expect(year2023!.evidenceIds).toContain("c1");

    // 2025: repo-b had 3 Python commits vs repo-a's 2 TypeScript commits → Python.
    const year2025 = evolution.find((f) => f.label === "2025");
    expect(year2025!.statement).toContain("Python");

    // Python's first dominant year is 2025 → an "appeared" fact.
    const appeared = evolution.find((f) => f.label.startsWith("Python"));
    expect(appeared).toBeDefined();
    expect(appeared!.statement).toContain("2025");
  });

  it("emits no language-evolution facts for years without language coverage", () => {
    // A repo without a language record contributes nothing to evolution.
    const evidence = fixture().filter((e) => e.repoFullName === REPO_A || e.source !== "language");
    const facts = analyzePatterns(evidence, curatedRepos());
    const evolution = facts.filter((f) => f.category === "language_evolution");
    // repo-b commits (c6, c7, c9, c10) must not produce Python dominance.
    for (const fact of evolution) {
      expect(fact.statement).not.toContain("Python");
    }
  });

  it("ranks focus areas by keyword matches over commit messages and PR/issue titles", () => {
    const facts = analyzePatterns(fixture(), curatedRepos());
    const focus = facts.filter((f) => f.category === "focus_areas");

    const api = focus.find((f) => f.label === "Focus: API");
    expect(api).toBeDefined();
    expect(api!.evidenceIds).toEqual(expect.arrayContaining(["c2", "c7", "c8"]));

    const ui = focus.find((f) => f.label === "Focus: UI");
    expect(ui).toBeDefined();
    expect(ui!.evidenceIds).toEqual(expect.arrayContaining(["c3", "i1"]));

    // Sorted by count desc: api/auth/data (3) > ui (2) > infra (1); ties alphabetical.
    expect(focus.map((f) => f.label)).toEqual([
      "Focus: API",
      "Focus: AUTH",
      "Focus: DATA",
      "Focus: INFRA",
      "Focus: UI",
    ]);
  });

  it("computes cadence per quarter, busiest quarter and longest streak", () => {
    const facts = analyzePatterns(fixture(), curatedRepos());
    const cadence = facts.filter((f) => f.category === "cadence");

    const q1_2024 = cadence.find((f) => f.label === "Q1 2024");
    expect(q1_2024).toBeDefined();
    expect(q1_2024!.statement).toContain("2 commits");
    expect(q1_2024!.statement).toContain("1 pull request");
    expect(q1_2024!.evidenceIds.sort()).toEqual(["c2", "p1"]);

    const busiest = cadence.find((f) => f.label === "Busiest quarter");
    expect(busiest).toBeDefined();
    expect(busiest!.statement).toContain("Q1 2025");

    const streak = cadence.find((f) => f.label === "Longest streak");
    expect(streak).toBeDefined();
    expect(streak!.statement).toContain("3 consecutive quarters");
  });

  it("ranks impact by commits, merged PRs and stars with backing evidence", () => {
    const facts = analyzePatterns(fixture(), curatedRepos());
    const impact = facts.filter((f) => f.category === "impact");

    const byCommits = impact.find((f) => f.label === "Most commits");
    expect(byCommits!.statement).toContain("userA/repo-a");
    expect(byCommits!.statement).toContain("6");
    expect(byCommits!.evidenceIds.every((id) => id.startsWith("c"))).toBe(true);

    const byMerged = impact.find((f) => f.label === "Most merged PRs");
    expect(byMerged!.statement).toContain("userA/repo-b");
    expect(byMerged!.statement).toContain("2");

    const byStars = impact.find((f) => f.label === "Most stars");
    expect(byStars!.statement).toContain("userA/repo-a");
    expect(byStars!.statement).toContain("42");
    expect(byStars!.evidenceIds.every((id) => idSetHas(fixture(), id))).toBe(true);
  });

  it("is fully deterministic: same input, same output", () => {
    const first = analyzePatterns(fixture(), curatedRepos());
    const second = analyzePatterns(fixture(), curatedRepos());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(second.map((f) => f.id)).toEqual([...first.map((f) => f.id)].sort());
  });

  it("returns [] for empty or insufficient evidence — never guesses", () => {
    expect(analyzePatterns([])).toEqual([]);
    // Language records alone are repo state, not activity — no facts.
    const onlyLanguages = fixture().filter((e) => e.source === "language");
    expect(analyzePatterns(onlyLanguages)).toEqual([]);
  });
});

function idSetHas(evidence: EvidenceRecord[], id: string): boolean {
  return evidence.some((e) => e.id === id);
}

// Referenced type keeps PatternFact import meaningful to editors.
export type { PatternFact };