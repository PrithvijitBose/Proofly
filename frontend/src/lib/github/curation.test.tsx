/**
 * Regression & Component Test Suite for Account-Switch Hydration and Storage Isolation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import {
  loadCuratedProjects,
  saveCuratedProjects,
  CuratedProject,
} from "./curation";
import { ProjectCuration } from "@/components/curation/project-curation";
import type { GitHubRepo, GitHubUser } from "./client";

const mockUserA: GitHubUser = {
  login: "userA",
  name: "User A",
  avatar_url: "https://example.com/avatarA.png",
  bio: "Bio A",
  company: null,
  blog: null,
  location: null,
  public_repos: 2,
  followers: 10,
  following: 5,
  created_at: "2020-01-01T00:00:00Z",
};

const mockUserB: GitHubUser = {
  login: "userB",
  name: "User B",
  avatar_url: "https://example.com/avatarB.png",
  bio: "Bio B",
  company: null,
  blog: null,
  location: null,
  public_repos: 1,
  followers: 2,
  following: 1,
  created_at: "2021-01-01T00:00:00Z",
};

const mockRepoA: GitHubRepo = {
  id: 101,
  name: "repo-a",
  full_name: "userA/repo-a",
  description: "User A repository",
  language: "TypeScript",
  stargazers_count: 50,
  forks_count: 5,
  created_at: "2020-01-01T00:00:00Z",
  pushed_at: "2026-01-01T00:00:00Z",
  archived: false,
  fork: false,
  html_url: "https://github.com/userA/repo-a",
};

const mockProjectA: CuratedProject = {
  repoId: 101,
  name: "repo-a",
  fullName: "userA/repo-a",
  htmlUrl: "https://github.com/userA/repo-a",
  description: "User A repository",
  language: "TypeScript",
  stargazersCount: 50,
  forksCount: 5,
  pushedAt: "2026-01-01T00:00:00Z",
  customNote: "Highlight note for Repo A",
  priority: 1,
};

describe("Account-Switch Curation Hydration & Storage Isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isolates localStorage curation entries per account", () => {
    // 1. Populate User A with saved curation entries
    saveCuratedProjects("userA", [mockProjectA]);
    const userAData = loadCuratedProjects("userA");
    expect(userAData).toHaveLength(1);
    expect(userAData[0].repoId).toBe(101);

    // 2. Account switch to User B who has NO saved entry
    const userBData = loadCuratedProjects("userB");
    expect(userBData).toEqual([]);

    // 3. Verify User A data remains untouched
    const reloadedUserA = loadCuratedProjects("userA");
    expect(reloadedUserA).toHaveLength(1);
    expect(reloadedUserA[0].repoId).toBe(101);
  });

  it("renders ProjectCuration with User A projects and removes them when rerendered with User B", async () => {
    // Seed User A storage with curated project
    saveCuratedProjects("userA", [mockProjectA]);

    // Render ProjectCuration for User A
    const { rerender } = render(
      <ProjectCuration availableRepos={[mockRepoA]} user={mockUserA} />
    );

    // Wait for hydration & verify User A's project is displayed
    expect(await screen.findByText("repo-a")).toBeDefined();

    // Rerender component with User B (new account with no saved entry)
    await act(async () => {
      rerender(<ProjectCuration availableRepos={[]} user={mockUserB} />);
    });

    // Assert User A's project is removed and empty state is rendered
    expect(screen.queryByText("repo-a")).toBeNull();
    expect(screen.getByText("No Highlighted Projects Yet")).toBeDefined();
  });
});
