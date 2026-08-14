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

export interface GitHubPullRequest {
  id: number;
  number: number;
  state: "open" | "closed";
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  body: string | null;
  user: GitHubCommitAuthor | null;
}

export interface GitHubIssue {
  id: number;
  number: number;
  state: "open" | "closed";
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  body: string | null;
  user: GitHubCommitAuthor | null;
  /** Present when this entry is actually a pull request (GitHub's issue endpoint returns both). */
  pull_request?: { url: string; html_url: string; diff_url: string; patch_url: string };
}

export class GitHubApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public rateLimit: boolean = false,
    /** Seconds GitHub asked us to wait (Retry-After header), when present. */
    public retryAfterSeconds?: number
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
    const retryAfterRaw = response.headers?.get?.("retry-after");
    const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : undefined;
    throw new GitHubApiError(
      response.status,
      message,
      rateLimited,
      retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined
    );
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
    console.log(`[fetchOwnedRepos] Page ${page} fetched ${batch.length} repos`);
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  console.log(`[fetchOwnedRepos] Total fetched repos: ${repos.length}`);
  if (repos.length > 0) {
    console.log(`[fetchOwnedRepos] Repo names:`, repos.map(r => `${r.name} (fork: ${r.fork}, archived: ${r.archived})`));
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

/**
 * Pull requests for a repository, newest first, capped at `cap` items.
 * GitHub's pulls endpoint has no `author` filter, so the author filter is
 * applied client-side. Repos with zero authored PRs return an empty array.
 */
export async function fetchRepoPulls(
  token: string,
  owner: string,
  repo: string,
  author: string,
  cap = 100
): Promise<GitHubPullRequest[]> {
  const pulls: GitHubPullRequest[] = [];
  const perPage = 100;
  const maxPages = Math.ceil(cap / perPage);
  let page = 1;
  while (page <= maxPages) {
    const batch = await ghRequest<GitHubPullRequest[]>(`/repos/${owner}/${repo}/pulls?state=all`, {
      token,
      perPage,
      page,
    });
    pulls.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return pulls.filter((pr) => pr.user?.login === author).slice(0, cap);
}

/**
 * Issues opened by `author` in a repository, newest first, capped at `cap`.
 * The `creator` filter is applied server-side by GitHub. Entries that are
 * actually pull requests (GitHub's issues endpoint returns both) are
 * excluded so nothing is double-counted against the pulls endpoint.
 */
export async function fetchRepoIssues(
  token: string,
  owner: string,
  repo: string,
  author: string,
  cap = 100
): Promise<GitHubIssue[]> {
  const issues: GitHubIssue[] = [];
  const perPage = 100;
  const maxPages = Math.ceil(cap / perPage);
  let page = 1;
  while (page <= maxPages) {
    const batch = await ghRequest<GitHubIssue[]>(
      `/repos/${owner}/${repo}/issues?state=all&creator=${encodeURIComponent(author)}`,
      { token, perPage, page }
    );
    issues.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return issues.filter((issue) => !issue.pull_request).slice(0, cap);
}

export interface GitHubEventPayload {
  ref?: string | null;
  ref_type?: string | null;
  action?: string | null;
  commits?: Array<{ sha: string; message: string; url: string }>;
  pull_request?: { number: number; title: string; html_url: string };
  issue?: { number: number; title: string; html_url: string };
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { id: number; name: string; url: string };
  actor: { login: string; id: number; avatar_url: string; html_url: string };
  payload: GitHubEventPayload;
}

/**
 * Public events for a user (30 per page), newest first, capped at
 * `maxPages` pages (default 10 → 300 events).
 */
export async function fetchUserEvents(
  token: string,
  login: string,
  maxPages = 10
): Promise<GitHubEvent[]> {
  const events: GitHubEvent[] = [];
  let page = 1;
  while (page <= maxPages) {
    const batch = await ghRequest<GitHubEvent[]>(
      `/users/${encodeURIComponent(login)}/events/public`,
      { token, perPage: 30, page }
    );
    events.push(...batch);
    if (batch.length < 30) break;
    page += 1;
  }
  return events;
}

/**
 * Byte counts per language for a repository (e.g. { TypeScript: 1234 }).
 */
export async function fetchRepoLanguages(
  token: string,
  owner: string,
  repo: string
): Promise<Record<string, number>> {
  return ghRequest<Record<string, number>>(`/repos/${owner}/${repo}/languages`, { token });
}