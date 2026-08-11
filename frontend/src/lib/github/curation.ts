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

/**
 * Returns a stable, per-account storage key for localStorage isolation.
 */
export function getCuratedStorageKey(userId: string): string {
  const safeId = (userId || "default").toLowerCase().trim();
  return `proofly_curated_projects_v1_${safeId}`;
}

/**
 * Reads curated projects from localStorage for a specific authenticated account.
 */
export function loadCuratedProjects(userId: string): CuratedProject[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const key = getCuratedStorageKey(userId);
    const raw = localStorage.getItem(key);
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
 * Persists curated projects to localStorage for a specific authenticated account.
 */
export function saveCuratedProjects(userId: string, projects: CuratedProject[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const key = getCuratedStorageKey(userId);
    // Re-index priority sequentially before saving
    const normalized = projects.map((p, idx) => ({
      ...p,
      priority: idx + 1,
    }));
    localStorage.setItem(key, JSON.stringify(normalized));
  } catch (err) {
    console.error("Failed to save curated projects to localStorage:", err);
  }
}

/**
 * Removes curated projects from localStorage for a specific authenticated account.
 */
export function clearCuratedProjects(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const key = getCuratedStorageKey(userId);
    localStorage.removeItem(key);
  } catch (err) {
    console.error("Failed to clear curated projects from localStorage:", err);
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
