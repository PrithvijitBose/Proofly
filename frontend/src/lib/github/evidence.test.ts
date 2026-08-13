/**
 * Tests for the evidence model, commit normalization, and the commit
 * gatherer. Raw GitHub JSON must normalize deterministically into
 * EvidenceRecords with resolvable URLs and provenance.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchRepoCommits,
  fetchRepoIssues,
  fetchRepoPulls,
  GitHubApiError,
} from "./client";
import type { GitHubCommit, GitHubIssue, GitHubPullRequest } from "./client";
import { normalizeCommit, normalizeIssue, normalizePullRequest, truncate, evidenceId } from "./evidence";
import { gatherEvidence } from "./gather";
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

function rawPull(overrides: Partial<GitHubPullRequest> = {}): GitHubPullRequest {
  return {
    id: 900,
    number: 42,
    state: "closed",
    title: "Add evidence ingestion",
    html_url: "https://github.com/userA/repo-a/pull/42",
    created_at: "2025-04-02T10:00:00Z",
    updated_at: "2025-04-03T10:00:00Z",
    merged_at: "2025-04-03T10:00:00Z",
    body: "Closes #41. Normalizes commits into evidence records.",
    user: { login: "userA", id: 1, avatar_url: "", html_url: "" },
    ...overrides,
  };
}

function rawIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    id: 800,
    number: 41,
    state: "open",
    title: "Add evidence ingestion",
    html_url: "https://github.com/userA/repo-a/issues/41",
    created_at: "2025-04-01T10:00:00Z",
    updated_at: "2025-04-01T10:00:00Z",
    body: "We should normalize commits into evidence records.",
    user: { login: "userA", id: 1, avatar_url: "", html_url: "" },
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

describe("normalizePullRequest", () => {
  it("normalizes a PR with number-based id, url, state and merged flag", () => {
    const record = normalizePullRequest(rawPull(), "userA/repo-a", FETCHED_AT);
    expect(record.id).toBe("pull_request:userA/repo-a:42");
    expect(record.source).toBe("pull_request");
    expect(record.url).toBe("https://github.com/userA/repo-a/pull/42");
    expect(record.title).toBe("Add evidence ingestion");
    expect(record.date).toBe("2025-04-02T10:00:00Z");
    expect(record.meta.state).toBe("closed");
    expect(record.meta.merged).toBe(true);
    expect(record.meta.mergedAt).toBe("2025-04-03T10:00:00Z");
    expect(record.detail).toContain("Closes #41");
  });

  it("marks unmerged PRs with merged: false", () => {
    const record = normalizePullRequest(rawPull({ merged_at: null }), "userA/repo-a", FETCHED_AT);
    expect(record.meta.merged).toBe(false);
    expect(record.meta.mergedAt).toBeNull();
  });

  it("sets detail to null when the PR has no body", () => {
    const record = normalizePullRequest(rawPull({ body: null }), "userA/repo-a", FETCHED_AT);
    expect(record.detail).toBeNull();
  });
});

describe("normalizeIssue", () => {
  it("normalizes an issue with number-based id and state", () => {
    const record = normalizeIssue(rawIssue(), "userA/repo-a", FETCHED_AT);
    expect(record.id).toBe("issue:userA/repo-a:41");
    expect(record.source).toBe("issue");
    expect(record.url).toBe("https://github.com/userA/repo-a/issues/41");
    expect(record.title).toBe("Add evidence ingestion");
    expect(record.meta.state).toBe("open");
    expect(record.detail).toContain("normalize commits");
  });
});

describe("fetchRepoPulls", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("filters pull requests client-side by author login", async () => {
    mockFetch(200, [
      rawPull({ number: 42, user: { login: "userA", id: 1, avatar_url: "", html_url: "" } }),
      rawPull({ number: 43, user: { login: "someoneElse", id: 2, avatar_url: "", html_url: "" } }),
    ]);
    const pulls = await fetchRepoPulls("token", "userA", "repo-a", "userA", 100);
    expect(pulls).toHaveLength(1);
    expect(pulls[0].number).toBe(42);
  });

  it("requests state=all with per_page=100", async () => {
    mockFetch(200, []);
    await fetchRepoPulls("token", "userA", "repo-a", "userA", 100);
    const [url] = vi.mocked(fetch).mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toContain("/repos/userA/repo-a/pulls");
    expect(url.searchParams.get("state")).toBe("all");
    expect(url.searchParams.get("per_page")).toBe("100");
  });

  it("returns an empty array for repos with no authored PRs", async () => {
    mockFetch(200, []);
    expect(await fetchRepoPulls("token", "userA", "repo-a", "userA", 100)).toEqual([]);
  });
});

describe("fetchRepoIssues", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("filters issues server-side via creator and excludes pull request entries", async () => {
    mockFetch(200, [
      rawIssue(),
      { ...rawIssue({ number: 44 }), pull_request: { url: "", html_url: "", diff_url: "", patch_url: "" } },
    ]);
    const issues = await fetchRepoIssues("token", "userA", "repo-a", "userA", 100);

    const [url] = vi.mocked(fetch).mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get("creator")).toBe("userA");
    expect(url.searchParams.get("state")).toBe("all");

    // The PR-shaped entry is excluded — no double-counting against the pulls endpoint.
    expect(issues).toHaveLength(1);
    expect(issues[0].number).toBe(41);
  });

  it("returns an empty array for repos with no authored issues", async () => {
    mockFetch(200, []);
    expect(await fetchRepoIssues("token", "userA", "repo-a", "userA", 100)).toEqual([]);
  });
});

describe("gatherEvidence", () => {
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

  /** Routes a mocked fetch by URL path so each endpoint returns its own body. */
  function mockGitHubFetch(routes: Record<string, unknown>) {
    const fn = vi.fn().mockImplementation(async (input: URL | string) => {
      const url = typeof input === "string" ? new URL(input) : input;
      for (const [pathPrefix, body] of Object.entries(routes)) {
        if (url.pathname.includes(pathPrefix)) {
          return { ok: true, status: 200, json: async () => body };
        }
      }
      return { ok: true, status: 200, json: async () => [] };
    });
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("normalizes commits, PRs and issues for curated repos", async () => {
    mockGitHubFetch({
      "/commits": [rawCommit()],
      "/pulls": [rawPull()],
      "/issues": [rawIssue()],
    });
    const result = await gatherEvidence("token", "userA", [project("userA/repo-a")], FETCHED_AT);

    expect(result.evidence).toHaveLength(3);
    expect(result.evidence.map((e) => e.source).sort()).toEqual(["commit", "issue", "pull_request"]);
    expect(result.evidence.every((e) => e.repoFullName === "userA/repo-a")).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("contributes zero records (and no errors) for repos with no authored activity", async () => {
    mockGitHubFetch({});
    const result = await gatherEvidence("token", "userA", [project("userA/repo-a")], FETCHED_AT);
    expect(result.evidence).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("degrades a failing endpoint into a warning while preserving partial evidence", async () => {
    const fn = vi.fn().mockImplementation(async (input: URL | string) => {
      const url = typeof input === "string" ? new URL(input) : input;
      if (url.pathname.includes("/repos/userA/repo-b/pulls")) {
        return { ok: false, status: 403, json: async () => ({}) };
      }
      if (url.pathname.includes("/pulls")) return { ok: true, status: 200, json: async () => [rawPull()] };
      if (url.pathname.includes("/commits")) return { ok: true, status: 200, json: async () => [rawCommit()] };
      return { ok: true, status: 200, json: async () => [] };
    });
    vi.stubGlobal("fetch", fn);

    const result = await gatherEvidence("token", "userA", [
      project("userA/repo-a"),
      project("userA/repo-b"),
    ], FETCHED_AT);

    // repo-a commits + pulls remain; repo-b's 403 on pulls becomes a warning.
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("repo-b");
    expect(result.warnings[0]).toContain("pull requests");
  });

  it("caps the number of curated repos processed (3 requests per repo)", async () => {
    mockGitHubFetch({});
    const projects = Array.from({ length: 12 }, (_, i) => project(`userA/repo-${i}`));
    const result = await gatherEvidence("token", "userA", projects, FETCHED_AT);
    expect(fetch).toHaveBeenCalledTimes(30); // 10 repos × 3 endpoints
    expect(result.warnings.some((w) => w.includes("10"))).toBe(true);
  });
});