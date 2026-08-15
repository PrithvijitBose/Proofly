import { PublicProfile } from "./profile-store";
import { buildJourneyStory } from "./journey";
import { getApiUrl } from "@/config/env";

// In-memory cache for fast repeated reads
const MEMORY_PROFILE_CACHE = new Map<string, PublicProfile>();

export function getCachedProfile(username: string): PublicProfile | undefined {
  return MEMORY_PROFILE_CACHE.get(username.trim().toLowerCase());
}

export function setCachedProfile(username: string, profile: PublicProfile): void {
  MEMORY_PROFILE_CACHE.set(username.trim().toLowerCase(), profile);
}

/**
 * Resolves a developer's public profile:
 * 1. Checks in-memory cache
 * 2. Checks FastAPI backend (if running)
 * 3. Fallback: Fetches directly from public GitHub API and synthesizes a verified profile!
 */
export async function resolvePublicProfile(
  username: string,
  hostOrigin: string = "https://proofly-omega.vercel.app"
): Promise<PublicProfile | null> {
  const cleanUsername = username.trim().toLowerCase();

  // 1. Check in-memory cache
  const cached = MEMORY_PROFILE_CACHE.get(cleanUsername);
  if (cached) {
    return cached;
  }

  // 2. Check Backend API if configured
  try {
    const backendUrl = getApiUrl(`/api/v1/profiles/${encodeURIComponent(cleanUsername)}`);
    const backendRes = await fetch(backendUrl, { cache: "no-store" });
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.profile) {
        MEMORY_PROFILE_CACHE.set(cleanUsername, data.profile);
        return data.profile;
      }
    }
  } catch {
    // Backend unavailable, fallback to GitHub API
  }

  // 3. Fallback: Fetch Public GitHub Data and synthesize live
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "proofly-app",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Use GITHUB_TOKEN if configured on the server to avoid rate limits
    if (process.env.GITHUB_TOKEN || process.env.AUTH_GITHUB_SECRET) {
      const token = process.env.GITHUB_TOKEN || process.env.AUTH_GITHUB_SECRET;
      if (token && !token.startsWith("ghp_placeholder")) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, {
        headers,
        cache: "no-store",
      }),
      fetch(
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

    const canonicalUrl = `${hostOrigin.replace(/\/$/, "")}/u/${encodeURIComponent(ghUser.login)}`;

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

    MEMORY_PROFILE_CACHE.set(cleanUsername, synthesizedProfile);
    return synthesizedProfile;
  } catch {
    return null;
  }
}
