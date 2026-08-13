/**
 * Evidence model for the journey generator.
 *
 * Every record carries its provenance: where it came from (source), which
 * repository it belongs to, its canonical GitHub URL, and when it was
 * fetched. IDs are deterministic (source:repo:native-id) so the same GitHub
 * object always yields the same record — stable across requests, which is
 * what lets guardrails resolve claim citations against the full store.
 */

import type { GitHubCommit, GitHubEvent, GitHubIssue, GitHubPullRequest } from "./client";

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

function eventRepoFullName(event: GitHubEvent): string {
  return event.repo?.name ?? "unknown";
}

function eventUrl(event: GitHubEvent): string {
  const repo = eventRepoFullName(event);
  if (event.payload?.pull_request?.html_url) return event.payload.pull_request.html_url;
  if (event.payload?.issue?.html_url) return event.payload.issue.html_url;
  if (event.payload?.commits?.[0]?.url) return event.payload.commits[0].url;
  return `https://github.com/${repo}`;
}

function eventTitle(event: GitHubEvent): string {
  const repo = eventRepoFullName(event);
  const short = repo.split("/")[1] ?? repo;
  const payload = event.payload ?? {};
  switch (event.type) {
    case "PushEvent": {
      const n = payload.commits?.length ?? 1;
      return `Pushed ${n} commit${n === 1 ? "" : "s"} to ${short}`;
    }
    case "PullRequestEvent":
      return payload.pull_request
        ? `PR #${payload.pull_request.number}: ${payload.pull_request.title}`
        : `Pull request activity on ${short}`;
    case "IssuesEvent":
      return payload.issue
        ? `Issue #${payload.issue.number}: ${payload.issue.title}`
        : `Issue activity on ${short}`;
    case "CreateEvent":
      return payload.ref_type && payload.ref
        ? `Created ${payload.ref_type} ${payload.ref} in ${short}`
        : `Created ${short}`;
    case "WatchEvent":
      return `Starred ${short}`;
    case "ForkEvent":
      return `Forked ${short}`;
    default:
      return `${event.type.replace(/Event$/, "") || "Activity"} on ${short}`;
  }
}

function eventDetail(event: GitHubEvent): string | null {
  if (event.type === "PushEvent") {
    const first = event.payload?.commits?.[0]?.message;
    return first ? truncate(first.trim(), DETAIL_MAX_LENGTH) : null;
  }
  return null;
}

/** Normalizes a GitHub user event into an EvidenceRecord. */
export function normalizeEvent(event: GitHubEvent, fetchedAt: string): EvidenceRecord {
  const repoFullName = eventRepoFullName(event);
  return {
    id: evidenceId("event", repoFullName, event.id),
    source: "event",
    repoFullName,
    url: eventUrl(event),
    title: truncate(eventTitle(event), TITLE_MAX_LENGTH),
    detail: eventDetail(event),
    date: event.created_at,
    meta: {
      type: event.type,
      eventId: event.id,
      action: event.payload?.action ?? null,
    },
    fetchedAt,
  };
}

/**
 * Normalizes a repository language map into a single EvidenceRecord with
 * the full byte counts in `meta`. Returns null when the repo has no
 * detectable languages (nothing to say — no fabrication).
 */
export function normalizeLanguage(
  languages: Record<string, number>,
  repoFullName: string,
  date: string,
  fetchedAt: string
): EvidenceRecord | null {
  const entries = Object.entries(languages);
  if (entries.length === 0) return null;
  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const top = entries.sort((a, b) => b[1] - a[1])[0][0];
  return {
    id: evidenceId("language", repoFullName, "languages"),
    source: "language",
    repoFullName,
    url: `https://github.com/${repoFullName}`,
    title: `${top} in ${repoFullName}`,
    detail: null,
    date,
    meta: { languages, totalBytes },
    fetchedAt,
  };
}