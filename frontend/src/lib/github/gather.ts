/**
 * Evidence gatherer: turns curated repositories into evidence records.
 *
 * Sources: commits, pull requests, issues (Task 1.2), plus user events and
 * repository languages (Task 1.3). The gatherer never fabricates — a repo
 * with zero authored activity simply contributes zero records, and per-repo
 * failures degrade into warnings with partial evidence, never a hard crash.
 */

import { fetchRepoCommits, fetchRepoIssues, fetchRepoPulls, GitHubApiError } from "./client";
import type { CuratedProject } from "./curation";
import { normalizeCommit, normalizeIssue, normalizePullRequest } from "./evidence";
import type { EvidenceRecord } from "./evidence";

export const MAX_CURATED_REPOS = 10;
export const MAX_COMMITS_PER_REPO = 100;
export const MAX_PULLS_PER_REPO = 100;
export const MAX_ISSUES_PER_REPO = 100;

export interface GatherResult {
  evidence: EvidenceRecord[];
  warnings: string[];
}

function splitRepoFullName(fullName: string): [string, string] | null {
  const parts = fullName.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

/**
 * Gathers commit, pull request and issue evidence for the given curated
 * repositories, sequentially. Each endpoint failure produces a warning and
 * the records gathered so far are preserved (partial-evidence degradation).
 */
export async function gatherEvidence(
  token: string,
  login: string,
  projects: CuratedProject[],
  fetchedAt: string
): Promise<GatherResult> {
  const evidence: EvidenceRecord[] = [];
  const warnings: string[] = [];
  const curated = projects.slice(0, MAX_CURATED_REPOS);
  if (projects.length > MAX_CURATED_REPOS) {
    warnings.push(
      `Evidence gathering covers the first ${MAX_CURATED_REPOS} curated repositories; the rest were skipped.`
    );
  }

  for (const project of curated) {
    const parts = splitRepoFullName(project.fullName);
    if (!parts) {
      warnings.push(`Skipped malformed repository reference: ${project.fullName}.`);
      continue;
    }
    const [owner, repo] = parts;

    // Commits
    try {
      const commits = await fetchRepoCommits(token, owner, repo, login, MAX_COMMITS_PER_REPO);
      for (const commit of commits) {
        evidence.push(normalizeCommit(commit, project.fullName, fetchedAt));
      }
    } catch (err) {
      warnings.push(
        `Could not read commits for ${project.fullName}: ${describeError(err)}`
      );
    }

    // Pull requests
    try {
      const pulls = await fetchRepoPulls(token, owner, repo, login, MAX_PULLS_PER_REPO);
      for (const pr of pulls) {
        evidence.push(normalizePullRequest(pr, project.fullName, fetchedAt));
      }
    } catch (err) {
      warnings.push(
        `Could not read pull requests for ${project.fullName}: ${describeError(err)}`
      );
    }

    // Issues (entries that are pull requests are excluded by the client)
    try {
      const issues = await fetchRepoIssues(token, owner, repo, login, MAX_ISSUES_PER_REPO);
      for (const issue of issues) {
        evidence.push(normalizeIssue(issue, project.fullName, fetchedAt));
      }
    } catch (err) {
      warnings.push(
        `Could not read issues for ${project.fullName}: ${describeError(err)}`
      );
    }
  }

  return { evidence, warnings };
}

function describeError(err: unknown): string {
  return err instanceof GitHubApiError ? err.message : "unknown error";
}