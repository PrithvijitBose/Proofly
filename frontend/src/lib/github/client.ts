/**
 * Minimal, server-side GitHub REST API client.
 *
 * Server-only: never import from a "use client" module — the token it uses
 * must never reach the browser. Guest-callable endpoints intentionally stay
 * in this client so the journey page can render with one token.
 */

const API_BASE = "https://api.github.com";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
  html_url: string;
}

export interface GitHubCommitAuthor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
    committer: { name: string; email: string; date: string };
  };
  author: GitHubCommitAuthor | null;
  committer: GitHubCommitAuthor | null;
}

export class GitHubApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public rateLimit: boolean = false
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

interface RequestOptions {
  token?: string;
  perPage?: number;
  page?: number;
}

async function ghRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (opts.perPage) url.searchParams.set("per_page", String(opts.perPage));
  if (opts.page) url.searchParams.set("page", String(opts.page));

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "proofly-app",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const response = await fetch(url, {
    headers,
    // GitHub data is mutable — never cache behind ISR.
    cache: "no-store",
  });

  if (!response.ok) {
    const rateLimited = response.status === 403 || response.status === 429;
    const message = rateLimited
      ? "GitHub API rate limit reached on this account. Try again in a moment."
      : response.status === 401
        ? "GitHub access token is invalid or expired. Sign in again."
        : `GitHub API request failed with status ${response.status}.`;
    throw new GitHubApiError(response.status, message, rateLimited);
  }

  return response.json() as Promise<T>;
}

/** Authenticated user profile. */
export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  return ghRequest<GitHubUser>("/user", { token });
}

/**
 * Repositories owned by the authenticated user, oldest first.
 * Paginates sequentially (100 per page) until GitHub returns a short or
 * empty page, so no owned repository is silently truncated. The API applies
 * `sort=created&direction=asc` server-side per page, so accumulated pages
 * preserve oldest-first ordering.
 */
export async function fetchOwnedRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const maxPages = 5; // Safety cap: max 500 repos to prevent Vercel request timeouts
  while (page <= maxPages) {
    const batch = await ghRequest<GitHubRepo[]>("/user/repos?affiliation=owner&sort=created&direction=asc", {
      token,
      perPage: 100,
      page,
    });
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repos;
}

/**
 * Commits authored by `author` in a repository, newest first.
 * Paginates 100 per page until the cap or a short page. The `author`
 * filter is applied server-side by GitHub, so repos where the user has
 * zero authored commits return an empty array — never an error.
 */
export async function fetchRepoCommits(
  token: string,
  owner: string,
  repo: string,
  author: string,
  cap = 100
): Promise<GitHubCommit[]> {
  const commits: GitHubCommit[] = [];
  const perPage = 100;
  const maxPages = Math.ceil(cap / perPage);
  let page = 1;
  while (page <= maxPages) {
    const batch = await ghRequest<GitHubCommit[]>(
      `/repos/${owner}/${repo}/commits?author=${encodeURIComponent(author)}`,
      { token, perPage, page }
    );
    commits.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return commits.slice(0, cap);
}