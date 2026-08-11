import type { GitHubRepo } from "./client";

export interface CuratedProject {
  repoId: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  pushedAt: string;
  customNote: string;
  priority: number; // 1-indexed priority order
}

const CURATED_STORAGE_KEY = "proofly_curated_projects_v1";

/**
 * Reads curated projects from localStorage.
 */
export function loadCuratedProjects(): CuratedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CURATED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => a.priority - b.priority);
    }
  } catch (err) {
    console.error("Failed to load curated projects from localStorage:", err);
  }
  return [];
}

/**
 * Persists curated projects to localStorage.
 */
export function saveCuratedProjects(projects: CuratedProject[]): void {
  if (typeof window === "undefined") return;
  try {
    // Re-index priority sequentially before saving
    const normalized = projects.map((p, idx) => ({
      ...p,
      priority: idx + 1,
    }));
    localStorage.setItem(CURATED_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.error("Failed to save curated projects to localStorage:", err);
  }
}

/**
 * Transforms a GitHubRepo object into a CuratedProject with initial priority.
 */
export function mapRepoToCuratedProject(repo: GitHubRepo, priority: number, customNote = ""): CuratedProject {
  return {
    repoId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    description: repo.description,
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    pushedAt: repo.pushed_at,
    customNote,
    priority,
  };
}
