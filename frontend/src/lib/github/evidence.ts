/**
 * Evidence model for the journey generator.
 *
 * Every record carries its provenance: where it came from (source), which
 * repository it belongs to, its canonical GitHub URL, and when it was
 * fetched. IDs are deterministic (source:repo:native-id) so the same GitHub
 * object always yields the same record — stable across requests, which is
 * what lets guardrails resolve claim citations against the full store.
 */

import type { GitHubCommit, GitHubIssue, GitHubPullRequest } from "./client";

export type EvidenceSource = "commit" | "pull_request" | "issue" | "event" | "language";

export interface EvidenceRecord {
  /** Stable, deterministic id: `{source}:{repoFullName}:{nativeId}`. */
  id: string;
  source: EvidenceSource;
  repoFullName: string;
  /** Canonical GitHub URL — always resolvable, never truncated. */
  url: string;
  /** First line of the message / subject line of the PR or issue. */
  title: string;
  /** Excerpt of the body (commit message remainder, PR body, ...). May be null. */
  detail: string | null;
  /** ISO-8601 date of the underlying GitHub object. */
  date: string;
  /** Source-specific structured data (state, merged flag, byte counts, ...). */
  meta: Record<string, unknown>;
  /** When this record was fetched. */
  fetchedAt: string;
}

export const TITLE_MAX_LENGTH = 120;
export const DETAIL_MAX_LENGTH = 300;
export const MESSAGE_MAX_LENGTH = 1000;
export const TRUNCATION_SUFFIX = "…";

/** Truncates long excerpts. Titles/URLs are never truncated by callers that care. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}${TRUNCATION_SUFFIX}`;
}

/** Deterministic evidence id — stable across requests for the same GitHub object. */
export function evidenceId(source: EvidenceSource, repoFullName: string, nativeId: string): string {
  return `${source}:${repoFullName}:${nativeId}`;
}

/** Normalizes raw GitHub commit JSON into an EvidenceRecord. */
export function normalizeCommit(
  commit: GitHubCommit,
  repoFullName: string,
  fetchedAt: string
): EvidenceRecord {
  const fullMessage = commit.commit?.message ?? "";
  const [firstLine = "", ...restLines] = fullMessage.split("\n");
  const detail = restLines.join("\n").trim();
  return {
    id: evidenceId("commit", repoFullName, commit.sha),
    source: "commit",
    repoFullName,
    url: commit.html_url,
    title: truncate(firstLine.trim(), TITLE_MAX_LENGTH),
    detail: detail ? truncate(detail, DETAIL_MAX_LENGTH) : null,
    date: commit.commit?.author?.date || commit.commit?.committer?.date || "",
    meta: {
      sha: commit.sha,
      authorLogin: commit.author?.login ?? null,
      authorName: commit.commit?.author?.name ?? null,
      message: truncate(fullMessage, MESSAGE_MAX_LENGTH),
    },
    fetchedAt,
  };
}

/** Normalizes raw GitHub pull request JSON into an EvidenceRecord. */
export function normalizePullRequest(
  pr: GitHubPullRequest,
  repoFullName: string,
  fetchedAt: string
): EvidenceRecord {
  return {
    id: evidenceId("pull_request", repoFullName, String(pr.number)),
    source: "pull_request",
    repoFullName,
    url: pr.html_url,
    title: truncate((pr.title ?? "").trim(), TITLE_MAX_LENGTH),
    detail: pr.body ? truncate(pr.body, DETAIL_MAX_LENGTH) : null,
    date: pr.created_at,
    meta: {
      number: pr.number,
      state: pr.state,
      merged: Boolean(pr.merged_at),
      mergedAt: pr.merged_at,
      authorLogin: pr.user?.login ?? null,
    },
    fetchedAt,
  };
}

/** Normalizes raw GitHub issue JSON into an EvidenceRecord. */
export function normalizeIssue(
  issue: GitHubIssue,
  repoFullName: string,
  fetchedAt: string
): EvidenceRecord {
  return {
    id: evidenceId("issue", repoFullName, String(issue.number)),
    source: "issue",
    repoFullName,
    url: issue.html_url,
    title: truncate((issue.title ?? "").trim(), TITLE_MAX_LENGTH),
    detail: issue.body ? truncate(issue.body, DETAIL_MAX_LENGTH) : null,
    date: issue.created_at,
    meta: {
      number: issue.number,
      state: issue.state,
      authorLogin: issue.user?.login ?? null,
    },
    fetchedAt,
  };
}