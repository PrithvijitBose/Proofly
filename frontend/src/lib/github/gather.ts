/**
 * Evidence gatherer: turns curated repositories into evidence records.
 *
 * Sources: commits, pull requests, issues, user events (scoped to curated
 * repos) and repository languages. Orchestration is budgeted so a hostile
 * or oversized dataset degrades gracefully:
 *   - hard request budget (default 50 requests) — once spent, gathering
 *     stops with a warning instead of hammering the GitHub API
 *   - at most `concurrency` (3) requests in flight
 *   - one retry on 403/429 honoring GitHub's Retry-After (never waiting
 *     longer than a few seconds — bounded runtime, never >300s)
 *   - total evidence cap (default 5,000 records)
 * Per-repo failures degrade into warnings with partial evidence, never a
 * crash. The gatherer never fabricates: zero authored activity means zero
 * records.
 */

import {
  fetchRepoCommits,
  fetchRepoIssues,
  fetchRepoLanguages,
  fetchRepoPulls,
  fetchUserEvents,
  GitHubApiError,
} from "./client";
import type { CuratedProject } from "./curation";
import { normalizeCommit, normalizeEvent, normalizeIssue, normalizeLanguage, normalizePullRequest } from "./evidence";
import type { EvidenceRecord } from "./evidence";

export const MAX_CURATED_REPOS = 10;
export const MAX_COMMITS_PER_REPO = 100;
export const MAX_PULLS_PER_REPO = 100;
export const MAX_ISSUES_PER_REPO = 100;
export const MAX_EVENT_PAGES = 10;
export const DEFAULT_REQUEST_BUDGET = 50;
export const DEFAULT_MAX_EVIDENCE_RECORDS = 5000;
export const DEFAULT_CONCURRENCY = 3;
/** Only retry rate limits that GitHub says we can wait for (seconds). */
export const MAX_RETRY_AFTER_SECONDS = 10;
/** Never sleep longer than this per retry (bounds worst-case runtime). */
export const MAX_RETRY_DELAY_SECONDS = 5;

export interface GatherResult {
  evidence: EvidenceRecord[];
  warnings: string[];
}

export interface GatherOptions {
  /** Hard cap on GitHub API requests (including retries). Default 50. */
  requestBudget?: number;
  /** Hard cap on collected evidence records. Default 5000. */
  maxEvidenceRecords?: number;
  /** Max concurrent in-flight requests. Default 3. */
  concurrency?: number;
}

interface Budget {
  remaining: number;
}

function splitRepoFullName(fullName: string): [string, string] | null {
  const parts = fullName.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

function describeError(err: unknown): string {
  return err instanceof GitHubApiError ? err.message : "unknown error";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the call once; on a rate-limit error with a tolerable Retry-After,
 * spends one more budget unit and retries exactly once.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  budget: Budget,
  warnings: string[],
  context: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (
      err instanceof GitHubApiError &&
      err.rateLimit &&
      err.retryAfterSeconds !== undefined &&
      err.retryAfterSeconds <= MAX_RETRY_AFTER_SECONDS &&
      budget.remaining > 0
    ) {
      budget.remaining -= 1;
      await sleep(Math.min(err.retryAfterSeconds, MAX_RETRY_DELAY_SECONDS) * 1000);
      try {
        return await fn();
      } catch (err2) {
        warnings.push(`${context}: ${describeError(err2)}`);
        return null;
      }
    }
    warnings.push(`${context}: ${describeError(err)}`);
    return null;
  }
}

/**
 * Gathers evidence for the given curated repositories with a bounded
 * request budget and bounded concurrency. Returns partial evidence plus
 * warnings when anything fails or caps are hit — never throws.
 */
export async function gatherEvidence(
  token: string,
  login: string,
  projects: CuratedProject[],
  fetchedAt: string,
  opts: GatherOptions = {}
): Promise<GatherResult> {
  const requestBudget = opts.requestBudget ?? DEFAULT_REQUEST_BUDGET;
  const maxEvidenceRecords = opts.maxEvidenceRecords ?? DEFAULT_MAX_EVIDENCE_RECORDS;
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;

  const budget: Budget = { remaining: requestBudget };
  const evidence: EvidenceRecord[] = [];
  const warnings: string[] = [];

  const curated = projects.slice(0, MAX_CURATED_REPOS);
  if (projects.length > MAX_CURATED_REPOS) {
    warnings.push(
      `Evidence gathering covers the first ${MAX_CURATED_REPOS} curated repositories; the rest were skipped.`
    );
  }
  const curatedNames = new Set(curated.map((p) => p.fullName));

  const pushRecord = (record: EvidenceRecord): void => {
    if (evidence.length >= maxEvidenceRecords) {
      if (!warnings.some((w) => w.startsWith("Evidence record cap"))) {
        warnings.push(
          `Evidence record cap (${maxEvidenceRecords}) reached — evidence is partial.`
        );
      }
      return;
    }
    evidence.push(record);
  };

  /** Runs a single request job, honoring the budget. */
  const runJob = async (context: string, fn: () => Promise<unknown>): Promise<void> => {
    if (budget.remaining <= 0) {
      if (!warnings.some((w) => w.startsWith("GitHub request budget"))) {
        warnings.push(
          `GitHub request budget (${requestBudget}) exhausted — evidence is partial.`
        );
      }
      return;
    }
    budget.remaining -= 1;
    await withRetry(fn, budget, warnings, context);
  };

  const jobs: Array<() => Promise<void>> = [];

  for (const project of curated) {
    const parts = splitRepoFullName(project.fullName);
    if (!parts) {
      warnings.push(`Skipped malformed repository reference: ${project.fullName}.`);
      continue;
    }
    const [owner, repo] = parts;

    jobs.push(() =>
      runJob(`commits for ${project.fullName}`, async () => {
        const commits = await fetchRepoCommits(token, owner, repo, login, MAX_COMMITS_PER_REPO);
        for (const commit of commits) pushRecord(normalizeCommit(commit, project.fullName, fetchedAt));
      })
    );

    jobs.push(() =>
      runJob(`pull requests for ${project.fullName}`, async () => {
        const pulls = await fetchRepoPulls(token, owner, repo, login, MAX_PULLS_PER_REPO);
        for (const pr of pulls) pushRecord(normalizePullRequest(pr, project.fullName, fetchedAt));
      })
    );

    jobs.push(() =>
      runJob(`issues for ${project.fullName}`, async () => {
        const issues = await fetchRepoIssues(token, owner, repo, login, MAX_ISSUES_PER_REPO);
        for (const issue of issues) pushRecord(normalizeIssue(issue, project.fullName, fetchedAt));
      })
    );

    jobs.push(() =>
      runJob(`languages for ${project.fullName}`, async () => {
        const languages = await fetchRepoLanguages(token, owner, repo);
        const record = normalizeLanguage(
          languages,
          project.fullName,
          project.pushedAt || fetchedAt,
          fetchedAt
        );
        if (record) pushRecord(record);
      })
    );
  }

  // User events — scoped to curated repos so evidence stays relevant.
  jobs.push(() =>
    runJob("user events", async () => {
      const events = await fetchUserEvents(token, login, MAX_EVENT_PAGES);
      for (const event of events) {
        if (curatedNames.has(event.repo?.name ?? "")) {
          pushRecord(normalizeEvent(event, fetchedAt));
        }
      }
    })
  );

  // Run the pool with bounded concurrency.
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < jobs.length) {
      const job = jobs[next];
      next += 1;
      await job();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));

  return { evidence, warnings };
}