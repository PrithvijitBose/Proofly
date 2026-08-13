/**
 * Evidence model for the journey generator.
 *
 * Every record carries its provenance: where it came from (source), which
 * repository it belongs to, its canonical GitHub URL, and when it was
 * fetched. IDs are deterministic (source:repo:native-id) so the same GitHub
 * object always yields the same record — stable across requests, which is
 * what lets guardrails resolve claim citations against the full store.
 */

import type { GitHubCommit } from "./client";

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