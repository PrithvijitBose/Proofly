import { PublicProfile } from "./profile-store";
import { buildJourneyStory } from "./journey";
import { getApiUrl, env, DEFAULT_PRODUCTION_APP_URL } from "@/config/env";

interface CacheEntry {
  profile: PublicProfile;
  isFallback: boolean;
  cachedAt: number;
}

const FALLBACK_TTL_MS = 60 * 1000; // 1 minute for unapproved synthesized fallbacks
const PUBLISHED_TTL_MS = 5 * 60 * 1000; // 5 minutes for published approved profiles
export const DEFAULT_REQUEST_TIMEOUT_MS = 6000; // 6 seconds timeout for remote lookups

/**
 * Validates candidate origin against trusted domain allowlist.
 */
export function resolveTrustedOrigin(candidate?: string): string {
  const fallback = env.appUrl || DEFAULT_PRODUCTION_APP_URL;
  if (!candidate) return fallback;

  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();

    // Allowlist: localhost, 127.0.0.1, IPv4 LAN, proofly domains, vercel app domains, or configured env.appUrl
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

    const isTrustedDomain =
      host === "proofly.dev" ||
      host.endsWith(".proofly.dev") ||
      host.endsWith(".vercel.app") ||
      (env.appUrl && new URL(env.appUrl).hostname.toLowerCase() === host);

    if (isLocal || isTrustedDomain) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // Malformed candidate URL
  }

  return fallback;
}

// In-memory cache for fast repeated reads
const MEMORY_PROFILE_CACHE = new Map<string, CacheEntry>();

/**
 * Shared AbortController-based fetch with timeout wrapper.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getCachedProfile(username: string): PublicProfile | undefined {
  const entry = MEMORY_PROFILE_CACHE.get(username.trim().toLowerCase());
  if (!entry) return undefined;
  const ttl = entry.isFallback ? FALLBACK_TTL_MS : PUBLISHED_TTL_MS;
  if (Date.now() - entry.cachedAt > ttl) {
    MEMORY_PROFILE_CACHE.delete(username.trim().toLowerCase());
    return undefined;
  }
  return entry.profile;
}

export function setCachedProfile(
  username: string,
  profile: PublicProfile,
  isFallback: boolean = false
): void {
  MEMORY_PROFILE_CACHE.set(username.trim().toLowerCase(), {
    profile,
    isFallback,
    cachedAt: Date.now(),
  });
}

export function invalidateCachedProfile(username: string): void {
  MEMORY_PROFILE_CACHE.delete(username.trim().toLowerCase());
}

/**
 * Resolves a developer's public profile:
 * 1. Checks in-memory cache for active approved published profile.
 * 2. Queries durable FastAPI backend with timeout to check for recently published profiles.
 * 3. Fallback: Fetches directly from public GitHub API with timeout and synthesizes a verified profile.
 */
export async function resolvePublicProfile(
  username: string,
  hostOrigin: string = "https://proofly-omega.vercel.app"
): Promise<PublicProfile | null> {
  const cleanUsername = username.trim().toLowerCase();

  // 1. Check in-memory cache for valid approved profile
  const cachedEntry = MEMORY_PROFILE_CACHE.get(cleanUsername);
  if (cachedEntry) {
    const ttl = cachedEntry.isFallback ? FALLBACK_TTL_MS : PUBLISHED_TTL_MS;
    const isFresh = Date.now() - cachedEntry.cachedAt < ttl;
    if (isFresh && !cachedEntry.isFallback && cachedEntry.profile.isApproved) {
      return cachedEntry.profile;
    }
  }

  // 2. Query durable Backend API to check for published profiles
  try {
    const backendUrl = getApiUrl(`/api/v1/profiles/${encodeURIComponent(cleanUsername)}`);
    const backendRes = await fetchWithTimeout(backendUrl, { cache: "no-store" });
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.profile) {
        setCachedProfile(cleanUsername, data.profile, false);
        return data.profile;
      }
    }
  } catch {
    // Backend unavailable, timed out, or profile not yet published -> proceed to fallback
  }

  // If in-memory cache had an unexpired fallback and backend has no published record, return it
  if (cachedEntry && Date.now() - cachedEntry.cachedAt < FALLBACK_TTL_MS) {
    return cachedEntry.profile;
  }

  // 3. Fallback: Fetch Public GitHub Data and synthesize live
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "proofly-app",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Use GITHUB_TOKEN if configured on the server to increase rate limits
    const token = process.env.GITHUB_TOKEN;
    if (token && !token.startsWith("ghp_placeholder") && !token.startsWith("placeholder")) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const [userRes, reposRes] = await Promise.all([
      fetchWithTimeout(
        `https://api.github.com/users/${encodeURIComponent(cleanUsername)}`,
        { headers, cache: "no-store" }
      ),
      fetchWithTimeout(
        `https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=30`,
        { headers, cache: "no-store" }
      ),
    ]);

    if (!userRes.ok) {
      return null;
    }

    const ghUser = await userRes.json();
    const ghRepos = reposRes.ok ? await reposRes.json() : [];

    const nonForkRepos = Array.isArray(ghRepos)
      ? ghRepos.filter((r: { fork?: boolean }) => !r.fork).slice(0, 10)
      : [];

    const story = buildJourneyStory(ghUser, nonForkRepos);

    const fallbackNarrative = {
      chapters: story.chapters.map((ch) => ({
        index: ch.index,
        title: ch.title,
        kicker: ch.kicker,
        claims: ch.paragraphs.map((p) => ({
          text: p,
          evidenceIds: [],
          verified: true,
        })),
        deterministic: true,
      })),
      summary: `Public developer identity for ${ghUser.name || ghUser.login} generated from verified GitHub activity.`,
      verifiedClaimCount: story.chapters.length,
      droppedClaimCount: 0,
      dropReasons: [],
    };

    const trustedOrigin = resolveTrustedOrigin(hostOrigin);
    const canonicalUrl = `${trustedOrigin}/u/${encodeURIComponent(ghUser.login)}`;

    const synthesizedProfile: PublicProfile = {
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url,
      bio: ghUser.bio,
      location: ghUser.location,
      company: ghUser.company,
      blog: ghUser.blog,
      publicRepos: ghUser.public_repos || 0,
      followers: ghUser.followers || 0,
      following: ghUser.following || 0,
      createdAt: ghUser.created_at || new Date().toISOString(),

      narrative: fallbackNarrative,
      tone: "Professional",
      isApproved: false,

      curatedProjects: nonForkRepos.map(
        (
          r: {
            id: number;
            name: string;
            full_name: string;
            html_url: string;
            description?: string;
            language?: string;
            stargazers_count?: number;
            forks_count?: number;
            pushed_at?: string;
          },
          idx: number
        ) => ({
          repoId: r.id,
          name: r.name,
          fullName: r.full_name,
          htmlUrl: r.html_url,
          description: r.description || null,
          language: r.language || null,
          stargazersCount: r.stargazers_count || 0,
          forksCount: r.forks_count || 0,
          pushedAt: r.pushed_at || "",
          customNote: "",
          priority: idx + 1,
        })
      ),
      evidence: [],
      patterns: [],

      publishedAt: new Date().toISOString(),
      canonicalUrl,
    };

    setCachedProfile(cleanUsername, synthesizedProfile, true);
    return synthesizedProfile;
  } catch {
    return null;
  }
}
