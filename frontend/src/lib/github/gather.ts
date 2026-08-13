/**
 * Evidence gatherer: turns curated repositories into evidence records.
 *
 * Task 1.1 scope: commits only. Extended in later tasks with PRs, issues,
 * user events and repository languages. The gatherer never fabricates —
 * a repo with zero authored commits simply contributes zero records.
 */

import { fetchRepoCommits, GitHubApiError } from "./client";
import type { CuratedProject } from "./curation";
import { normalizeCommit } from "./evidence";
import type { EvidenceRecord } from "./evidence";

export const MAX_CURATED_REPOS = 10;
export const MAX_COMMITS_PER_REPO = 100;

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
 * Gathers commit evidence for the given curated repositories, sequentially.
 * Per-repo failures degrade into warnings — one bad repo never fails the
 * whole gathering pass.
 */
export async function gatherCommitEvidence(
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
    try {
      const commits = await fetchRepoCommits(
        token,
        owner,
        repo,
        login,
        MAX_COMMITS_PER_REPO
      );
      for (const commit of commits) {
        evidence.push(normalizeCommit(commit, project.fullName, fetchedAt));
      }
    } catch (err) {
      warnings.push(
        `Could not read commits for ${project.fullName}: ${
          err instanceof GitHubApiError ? err.message : "unknown error"
        }`
      );
    }
  }

  return { evidence, warnings };
}