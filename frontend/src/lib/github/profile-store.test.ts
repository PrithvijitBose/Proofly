import { describe, it, expect, beforeEach } from "vitest";
import {
  constructPublicProfile,
  loadLocalPublicProfile,
  saveLocalPublicProfile,
  getPublicProfileStorageKey,
} from "./profile-store";
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
});
