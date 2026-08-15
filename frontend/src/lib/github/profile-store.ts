/**
 * Public Profile Store & Synchronization Layer.
 *
 * Unifies the developer's approved identity:
 *   - Profile details (name, avatar, bio, stats, links)
 *   - Approved career narrative (chapters, kickers, cited claims)
 *   - Curated repositories & custom highlighted notes
 *   - Verified evidence records (commits, PRs, issues)
 *   - Canonical public URL & QR metadata
 *
 * Implements dual-layer persistence:
 *   1. Client-side localStorage for instant offline access and preview.
 *   2. Server-side API endpoints for zero-account public visitors (/u/[username]).
 */

import type { GitHubUser } from "./client";
import type { CuratedProject } from "./curation";
import type { GuardedNarrative } from "./guardrails";
import type { EvidenceRecord } from "./evidence";
import type { PatternFact } from "./patterns";

export interface PublicProfile {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;

  // Professional Story & Tone
  narrative: GuardedNarrative;
  tone: string;
  customPrompt?: string;
  isApproved: boolean;

  // Curated Projects & Evidence
  curatedProjects: CuratedProject[];
  evidence: EvidenceRecord[];
  patterns: PatternFact[];

  // Publishing metadata
  publishedAt: string;
  canonicalUrl: string;
}

export function isValidPublicProfile(obj: unknown): obj is PublicProfile {
  if (!obj || typeof obj !== "object") return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.username === "string" &&
    p.username.trim().length > 0 &&
    typeof p.avatarUrl === "string" &&
    typeof p.narrative === "object" &&
    p.narrative !== null &&
    Array.isArray((p.narrative as Record<string, unknown>).chapters) &&
    Array.isArray(p.curatedProjects) &&
    Array.isArray(p.evidence) &&
    Array.isArray(p.patterns)
  );
}

const STORAGE_PREFIX = "proofly_public_profile_";

export function getPublicProfileStorageKey(username: string): string {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-") || "default";
  return `${STORAGE_PREFIX}${safe}`;
}

export function loadLocalPublicProfile(username: string): PublicProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getPublicProfileStorageKey(username));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicProfile;
    if (parsed && typeof parsed === "object" && parsed.username && parsed.narrative) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLocalPublicProfile(profile: PublicProfile): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(
      getPublicProfileStorageKey(profile.username),
      JSON.stringify(profile)
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds a full PublicProfile bundle from existing account states.
 */
export function constructPublicProfile(
  user: GitHubUser,
  narrative: GuardedNarrative,
  curatedProjects: CuratedProject[],
  evidence: EvidenceRecord[],
  patterns: PatternFact[],
  options: {
    tone?: string;
    customPrompt?: string;
    origin?: string;
  } = {}
): PublicProfile {
  const origin =
    options.origin ||
    (typeof window !== "undefined" ? window.location.origin : "https://proofly.dev");
  const canonicalUrl = `${origin}/u/${encodeURIComponent(user.login)}`;

  return {
    username: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    location: user.location,
    company: user.company,
    blog: user.blog,
    publicRepos: user.public_repos || 0,
    followers: user.followers || 0,
    following: user.following || 0,
    createdAt: user.created_at || new Date().toISOString(),

    narrative,
    tone: options.tone || "Professional",
    customPrompt: options.customPrompt,
    isApproved: true,

    curatedProjects,
    evidence,
    patterns,

    publishedAt: new Date().toISOString(),
    canonicalUrl,
  };
}

/**
 * Publishes/syncs the public profile to both local storage and the server API.
 */
export async function publishPublicProfile(profile: PublicProfile): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(profile.username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.message || `Server sync failed with status ${res.status}`,
      };
    }

    // Save locally on successful sync and verify local storage write
    const localOk = saveLocalPublicProfile(profile);
    if (!localOk && typeof window !== "undefined") {
      return {
        success: false,
        error: "Failed to persist profile to browser local storage.",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error during server sync",
    };
  }
}

/**
 * Fetches a public profile for any visitor.
 */
export async function fetchServerPublicProfile(username: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile as PublicProfile;
  } catch {
    return null;
  }
}
