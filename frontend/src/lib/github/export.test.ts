/**
 * Export bundle tests — self-contained claim resolution.
 */

import { describe, expect, it } from "vitest";
import { buildJourneyBundle, resolveClaimEvidence } from "./export";
import type { EvidenceRecord } from "./evidence";
import type { GuardedNarrative } from "./guardrails";
import type { GitHubUser } from "./client";

const FETCHED_AT = "2026-01-15T12:00:00Z";

const user: GitHubUser = {
  login: "userA",
  name: "User A",
  avatar_url: "https://example.com/avatarA.png",
  bio: null,
  company: null,
  blog: null,
  location: null,
  public_repos: 1,
  followers: 1,
  following: 0,
  created_at: "2020-01-01T00:00:00Z",
};

const repos = [
  {
    repoId: 101,
    name: "repo-a",
    fullName: "userA/repo-a",
    htmlUrl: "https://github.com/userA/repo-a",
    description: null,
    language: "TypeScript",
    stargazersCount: 50,
    forksCount: 5,
    pushedAt: "2026-01-01T00:00:00Z",
    customNote: "Lead work",
    priority: 1,
  },
];

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

const evidence = [commitRecord];

const narrative: GuardedNarrative = {
  chapters: [
    {
      index: 1,
      title: "The beginning",
      kicker: "first line",
      claims: [
        { text: "Started in March 2023.", evidenceIds: ["commit:userA/repo-a:abc1234"], verified: true },
      ],
    },
  ],
  verifiedClaimCount: 1,
  droppedClaimCount: 0,
  dropReasons: [],
};

const patterns = [
  {
    id: "timeline-0",
    label: "First activity",
    statement: "First activity: userA/repo-a, March 2023",
    evidenceIds: ["commit:userA/repo-a:abc1234"],
    category: "timeline" as const,
  },
];

describe("buildJourneyBundle", () => {
  it("produces a self-contained bundle with an ISO exportedAt timestamp", () => {
    const bundle = buildJourneyBundle({ user, repos, patterns, narrative, evidence, warnings: [] });

    expect(bundle.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(bundle.user.login).toBe("userA");
    expect(bundle.repos).toBe(repos);
    expect(bundle.patterns).toBe(patterns);
    expect(bundle.narrative).toBe(narrative);
    expect(bundle.evidence).toBe(evidence);
    expect(bundle.warnings).toEqual([]);
  });

  it("throws when a claim cites evidence missing from the bundle", () => {
    expect(() =>
      buildJourneyBundle({
        user,
        repos,
        patterns,
        narrative: {
          ...narrative,
          chapters: [
            {
              index: 1,
              title: "t",
              kicker: "k",
              claims: [{ text: "Ghost.", evidenceIds: ["commit:userA/repo-a:deadbeef"], verified: true }],
            },
          ],
        },
        evidence,
        warnings: [],
      })
    ).toThrow(/commit:userA\/repo-a:deadbeef/);
  });
});

describe("resolveClaimEvidence", () => {
  it("resolves cited ids to records within the same store", () => {
    const resolved = resolveClaimEvidence(narrative.chapters[0].claims[0], evidence);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe("commit:userA/repo-a:abc1234");
  });

  it("skips ids that do not resolve (never throws)", () => {
    const resolved = resolveClaimEvidence(
      { text: "t", evidenceIds: ["commit:userA/repo-a:abc1234", "ghost"], verified: true },
      evidence
    );
    expect(resolved).toHaveLength(1);
  });
});