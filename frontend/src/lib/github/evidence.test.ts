/**
 * Tests for the evidence model, commit normalization, and the commit
 * gatherer. Raw GitHub JSON must normalize deterministically into
 * EvidenceRecords with resolvable URLs and provenance.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRepoCommits, GitHubApiError } from "./client";
import type { GitHubCommit } from "./client";
import { normalizeCommit, truncate, evidenceId } from "./evidence";
import { gatherCommitEvidence } from "./gather";
import type { CuratedProject } from "./curation";

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })
  );
}

function rawCommit(overrides: Partial<GitHubCommit> = {}): GitHubCommit {
  return {
    sha: "abc123def456",
    html_url: "https://github.com/userA/repo-a/commit/abc123def456",
    commit: {
      message: "Add evidence ingestion\n\nNormalizes GitHub commits into EvidenceRecords.",
      author: { name: "User A", email: "a@example.com", date: "2025-03-01T10:00:00Z" },
      committer: { name: "User A", email: "a@example.com", date: "2025-03-01T10:00:00Z" },
    },
    author: { login: "userA", id: 1, avatar_url: "", html_url: "" },
    committer: { login: "userA", id: 1, avatar_url: "", html_url: "" },
    ...overrides,
  };
}

const FETCHED_AT = "2026-01-15T12:00:00Z";

describe("normalizeCommit", () => {
  it("normalizes raw GitHub commit JSON into an EvidenceRecord with provenance", () => {
    const record = normalizeCommit(rawCommit(), "userA/repo-a", FETCHED_AT);

    expect(record.id).toBe("commit:userA/repo-a:abc123def456");
    expect(record.source).toBe("commit");
    expect(record.repoFullName).toBe("userA/repo-a");
    expect(record.url).toBe("https://github.com/userA/repo-a/commit/abc123def456");
    expect(record.title).toBe("Add evidence ingestion");
    expect(record.detail).toContain("Normalizes GitHub commits");
    expect(record.date).toBe("2025-03-01T10:00:00Z");
    expect(record.meta.sha).toBe("abc123def456");
    expect(record.meta.authorLogin).toBe("userA");
    expect(record.fetchedAt).toBe(FETCHED_AT);
  });

  it("uses the first message line as title and the rest as detail", () => {
    const record = normalizeCommit(rawCommit(), "userA/repo-a", FETCHED_AT);
    expect(record.title).toBe("Add evidence ingestion");
    expect(record.detail).toBe("Normalizes GitHub commits into EvidenceRecords.");
  });

  it("sets detail to null for single-line messages", () => {
    const commit = rawCommit({ commit: { ...rawCommit().commit, message: "Single line only" } });
    const record = normalizeCommit(commit, "userA/repo-a", FETCHED_AT);
    expect(record.detail).toBeNull();
  });

  it("truncates long titles and details with an ellipsis", () => {
    const longTitle = "fix: ".concat("x".repeat(300));
    const longBody = "body ".repeat(200);
    const commit = rawCommit({
      commit: { ...rawCommit().commit, message: `${longTitle}\n\n${longBody}` },
    });
    const record = normalizeCommit(commit, "userA/repo-a", FETCHED_AT);

    expect(record.title.length).toBeLessThanOrEqual(120);
    expect(record.title.endsWith("…")).toBe(true);
    expect(record.detail!.length).toBeLessThanOrEqual(300);
    expect(record.detail!.endsWith("…")).toBe(true);
    // The URL is never truncated.
    expect(record.url).toBe(commit.html_url);
  });

  it("produces stable, deterministic ids", () => {
    const a = normalizeCommit(rawCommit(), "userA/repo-a", FETCHED_AT);
    const b = normalizeCommit(rawCommit(), "userA/repo-a", "2026-02-01T00:00:00Z");
    expect(a.id).toBe(b.id);

    const other = normalizeCommit(rawCommit({ sha: "deadbeef" }), "userA/repo-a", FETCHED_AT);
    expect(other.id).not.toBe(a.id);
  });

  it("differs across repositories even for the same sha", () => {
    const inA = normalizeCommit(rawCommit(), "userA/repo-a", FETCHED_AT);
    const inB = normalizeCommit(rawCommit(), "userA/repo-b", FETCHED_AT);
    expect(inA.id).not.toBe(inB.id);
  });

  it("falls back to committer date when author date is missing", () => {
    const commit = rawCommit({
      commit: {
        ...rawCommit().commit,
        author: { ...rawCommit().commit.author, date: "" },
      },
    });
    const record = normalizeCommit(commit, "userA/repo-a", FETCHED_AT);
    expect(record.date).toBe("2025-03-01T10:00:00Z");
  });
});

describe("truncate + evidenceId", () => {
  it("truncates only beyond the max length", () => {
    expect(truncate("short", 120)).toBe("short");
  });
  it("builds stable ids", () => {
    expect(evidenceId("commit", "o/r", "sha1")).toBe("commit:o/r:sha1");
  });
});

describe("fetchRepoCommits", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests authored commits with per_page=100 and the author filter", async () => {
    mockFetch(200, [rawCommit()]);
    await fetchRepoCommits("token", "userA", "repo-a", "userA", 100);

    const [url, opts] = vi.mocked(fetch).mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toContain("/repos/userA/repo-a/commits");
    expect(url.searchParams.get("author")).toBe("userA");
    expect(url.searchParams.get("per_page")).toBe("100");
    expect(url.searchParams.get("page")).toBe("1");
    expect(opts.headers).toMatchObject({ Authorization: "Bearer token" });
  });

  it("returns an empty array for repos with zero authored commits", async () => {
    mockFetch(200, []);
    const commits = await fetchRepoCommits("token", "userA", "repo-a", "userA", 100);
    expect(commits).toEqual([]);
  });

  it("caps the returned commits at the cap", async () => {
    const many = Array.from({ length: 100 }, (_, i) => rawCommit({ sha: `sha${i}` }));
    mockFetch(200, many);
    const commits = await fetchRepoCommits("token", "userA", "repo-a", "userA", 10);
    expect(commits).toHaveLength(10);
  });

  it("surfaces rate-limit failures as GitHubApiError", async () => {
    mockFetch(429, {});
    await expect(fetchRepoCommits("token", "userA", "repo-a", "userA", 100)).rejects.toBeInstanceOf(
      GitHubApiError
    );
  });
});

describe("gatherCommitEvidence", () => {
  afterEach(() => vi.unstubAllGlobals());

  const project = (fullName: string): CuratedProject => ({
    repoId: 1,
    name: fullName.split("/")[1],
    fullName,
    htmlUrl: `https://github.com/${fullName}`,
    description: null,
    language: null,
    stargazersCount: 0,
    forksCount: 0,
    pushedAt: "",
    customNote: "",
    priority: 1,
  });

  it("normalizes commits for every curated repo with authored commits", async () => {
    mockFetch(200, [rawCommit(), rawCommit({ sha: "secondsha" })]);
    const result = await gatherCommitEvidence("token", "userA", [project("userA/repo-a")], FETCHED_AT);
    expect(result.evidence).toHaveLength(2);
    expect(result.evidence.every((e) => e.repoFullName === "userA/repo-a")).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("contributes zero records (and no errors) for repos with no authored commits", async () => {
    mockFetch(200, []);
    const result = await gatherCommitEvidence("token", "userA", [project("userA/repo-a")], FETCHED_AT);
    expect(result.evidence).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("degrades a failing repo into a warning instead of failing the pass", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [rawCommit()] })
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await gatherCommitEvidence("token", "userA", [
      project("userA/repo-a"),
      project("userA/repo-b"),
    ], FETCHED_AT);

    expect(result.evidence).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("repo-b");
  });

  it("caps the number of curated repos processed", async () => {
    mockFetch(200, []);
    const projects = Array.from({ length: 12 }, (_, i) => project(`userA/repo-${i}`));
    const result = await gatherCommitEvidence("token", "userA", projects, FETCHED_AT);
    expect(fetch).toHaveBeenCalledTimes(10);
    expect(result.warnings.some((w) => w.includes("10"))).toBe(true);
  });
});