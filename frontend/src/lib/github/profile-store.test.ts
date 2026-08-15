import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  constructPublicProfile,
  loadLocalPublicProfile,
  saveLocalPublicProfile,
  getPublicProfileStorageKey,
  isValidPublicProfile,
  publishPublicProfile,
} from "./profile-store";
import { resolveTrustedOrigin } from "./public-profile-service";
import type { GitHubUser } from "./client";
import type { GuardedNarrative } from "./guardrails";
import type { CuratedProject } from "./curation";

const mockUser: GitHubUser = {
  login: "testdev",
  name: "Test Developer",
  avatar_url: "https://avatars.githubusercontent.com/u/12345",
  bio: "Full-stack engineer & open-source builder",
  company: "Acme Corp",
  blog: "https://testdev.dev",
  location: "San Francisco, CA",
  public_repos: 42,
  followers: 120,
  following: 30,
  created_at: "2021-01-01T00:00:00Z",
};

const mockNarrative: GuardedNarrative = {
  chapters: [
    {
      index: 1,
      title: "The Architecture Foundation",
      kicker: "first commit",
      claims: [
        {
          text: "Built a high-performance distributed key-value store.",
          evidenceIds: ["commit:testdev/kv:abc1234"],
          verified: true,
        },
      ],
    },
  ],
  summary: "A passionate engineer building distributed systems.",
  verifiedClaimCount: 1,
  droppedClaimCount: 0,
  dropReasons: [],
};

const mockCuratedProjects: CuratedProject[] = [
  {
    repoId: 101,
    name: "distributed-kv",
    fullName: "testdev/distributed-kv",
    htmlUrl: "https://github.com/testdev/distributed-kv",
    description: "Distributed key-value store in Rust",
    language: "Rust",
    stargazersCount: 350,
    forksCount: 45,
    pushedAt: "2026-08-01T12:00:00Z",
    customNote: "Designed Raft consensus engine",
    priority: 1,
  },
];

describe("Public Profile Store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("constructs a complete PublicProfile object with canonical URL", () => {
    const profile = constructPublicProfile(
      mockUser,
      mockNarrative,
      mockCuratedProjects,
      [],
      [],
      { tone: "Technical", origin: "https://proofly.dev" }
    );

    expect(profile.username).toBe("testdev");
    expect(profile.name).toBe("Test Developer");
    expect(profile.canonicalUrl).toBe("https://proofly.dev/u/testdev");
    expect(profile.tone).toBe("Technical");
    expect(profile.curatedProjects.length).toBe(1);
    expect(profile.narrative.chapters.length).toBe(1);
    expect(profile.isApproved).toBe(true);
  });

  it("saves and loads public profile from localStorage correctly", () => {
    const profile = constructPublicProfile(
      mockUser,
      mockNarrative,
      mockCuratedProjects,
      [],
      []
    );

    const saved = saveLocalPublicProfile(profile);
    expect(saved).toBe(true);

    const loaded = loadLocalPublicProfile("testdev");
    expect(loaded).not.toBeNull();
    expect(loaded?.username).toBe("testdev");
    expect(loaded?.name).toBe("Test Developer");
    expect(loaded?.curatedProjects[0].name).toBe("distributed-kv");
  });

  it("returns null for non-existent local public profile", () => {
    const loaded = loadLocalPublicProfile("non-existent-user");
    expect(loaded).toBeNull();
  });

  it("computes safe storage keys with normalization", () => {
    expect(getPublicProfileStorageKey("User.Name_123")).toBe(
      "proofly_public_profile_user.name_123"
    );
    expect(getPublicProfileStorageKey("")).toBe("proofly_public_profile_default");
  });

  it("validates complete PublicProfile payload structure using isValidPublicProfile", () => {
    const validProfile = constructPublicProfile(
      mockUser,
      mockNarrative,
      mockCuratedProjects,
      [],
      []
    );

    expect(isValidPublicProfile(validProfile)).toBe(true);
    expect(isValidPublicProfile(null)).toBe(false);
    expect(isValidPublicProfile({})).toBe(false);
    expect(isValidPublicProfile({ username: "test" })).toBe(false);
    expect(
      isValidPublicProfile({
        username: "test",
        avatarUrl: "http://example.com/avatar.png",
        narrative: null,
      })
    ).toBe(false);
  });

  it("publishPublicProfile returns success: true on successful server sync", async () => {
    const validProfile = constructPublicProfile(
      mockUser,
      mockNarrative,
      mockCuratedProjects,
      [],
      []
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response);

    const result = await publishPublicProfile(validProfile);
    expect(result.success).toBe(true);
    expect(loadLocalPublicProfile("testdev")).not.toBeNull();
  });

  it("publishPublicProfile returns success: false with error on server rejection", async () => {
    const validProfile = constructPublicProfile(
      mockUser,
      mockNarrative,
      mockCuratedProjects,
      [],
      []
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Unauthorized actor" }),
    } as Response);

    const result = await publishPublicProfile(validProfile);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized actor");
  });

  it("resolveTrustedOrigin validates allowed domains and rejects attacker-supplied origins", () => {
    expect(resolveTrustedOrigin("https://proofly.dev")).toBe("https://proofly.dev");
    expect(resolveTrustedOrigin("https://proofly-omega.vercel.app")).toBe(
      "https://proofly-omega.vercel.app"
    );
    expect(resolveTrustedOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(resolveTrustedOrigin("http://192.168.1.50:3000")).toBe("http://192.168.1.50:3000");

    // Rejects untrusted domain and falls back to default
    expect(resolveTrustedOrigin("https://evil-phishing-site.com")).toBe(
      "https://proofly-omega.vercel.app"
    );
    expect(resolveTrustedOrigin("not-a-valid-url")).toBe(
      "https://proofly-omega.vercel.app"
    );
  });
});
