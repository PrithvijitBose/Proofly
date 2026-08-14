import { describe, expect, it } from "vitest";
import type { GitHubRepo, GitHubUser } from "./client";
import { buildJourneyStory } from "./journey";

const MOCK_USER: GitHubUser = {
  login: "testdev",
  name: "Test Developer",
  avatar_url: "https://avatars.githubusercontent.com/u/12345",
  bio: "Full-stack engineer",
  company: null,
  blog: null,
  location: null,
  public_repos: 5,
  followers: 42,
  following: 10,
  created_at: "2020-01-01T00:00:00Z",
};

function makeRepo(partial: Partial<GitHubRepo> & { name: string }): GitHubRepo {
  return {
    id: Math.floor(Math.random() * 100000),
    full_name: `testdev/${partial.name}`,
    html_url: `https://github.com/testdev/${partial.name}`,
    description: "Sample description",
    language: "TypeScript",
    stargazers_count: 5,
    forks_count: 2,
    pushed_at: "2024-01-01T00:00:00Z",
    created_at: "2023-01-01T00:00:00Z",
    archived: false,
    fork: false,
    ...partial,
  };
}

describe("buildJourneyStory", () => {
  it("builds a multi-chapter story for normal dated repositories", () => {
    const repos: GitHubRepo[] = [
      makeRepo({
        name: "first-repo",
        created_at: "2022-03-15T00:00:00Z",
        language: "JavaScript",
        stargazers_count: 2,
        description: "My very first project",
      }),
      makeRepo({
        name: "breakout-tool",
        created_at: "2023-05-10T00:00:00Z",
        language: "TypeScript",
        stargazers_count: 50,
        forks_count: 10,
        description: "A popular utility",
      }),
      makeRepo({
        name: "recent-app",
        created_at: "2024-02-01T00:00:00Z",
        pushed_at: new Date().toISOString(),
        language: "TypeScript",
        stargazers_count: 5,
      }),
    ];

    const story = buildJourneyStory(MOCK_USER, repos);

    expect(story.hadHistory).toBe(true);
    expect(story.userName).toBe("Test Developer");
    expect(story.userLogin).toBe("testdev");
    expect(story.stats).toEqual([
      { label: "Repositories", value: "3" },
      { label: "Total stars", value: "57" },
      { label: "Languages", value: "2" },
    ]);

    // Chapter 1 should pick first-repo (March 2022)
    const ch1 = story.chapters.find((c) => c.index === 1);
    expect(ch1).toBeDefined();
    expect(ch1?.title).toBe("The First Line");
    expect(ch1?.paragraphs[0]).toContain("First Repo");
    expect(ch1?.paragraphs[0]).toContain("March 2022");
    expect(ch1?.stats).toContainEqual({ label: "Started", value: "March 2022" });
    expect(ch1?.stats).toContainEqual({ label: "First language", value: "JavaScript" });

    // Chapter 3 should pick breakout-tool (50 stars)
    const ch3 = story.chapters.find((c) => c.index === 3);
    expect(ch3).toBeDefined();
    expect(ch3?.title).toBe("The Breakout");
    expect(ch3?.paragraphs[0]).toContain("Breakout Tool");
  });

  it("regression: prioritizes finite creation timestamps over undated legacy curated projects", () => {
    // Legacy curated projects may lack createdAt and have created_at: ""
    const legacyProject = makeRepo({
      name: "legacy-untracked-date",
      created_at: "",
      language: "Python",
      stargazers_count: 12,
      forks_count: 3,
      description: "Legacy curated tool",
    });

    const datedFirstProject = makeRepo({
      name: "dated-first-repo",
      created_at: "2023-04-10T00:00:00Z",
      language: "TypeScript",
      stargazers_count: 8,
      description: "First real dated repository",
    });

    const datedSecondProject = makeRepo({
      name: "dated-second-repo",
      created_at: "2024-01-20T00:00:00Z",
      language: "TypeScript",
      stargazers_count: 20,
    });

    const story = buildJourneyStory(MOCK_USER, [legacyProject, datedFirstProject, datedSecondProject]);

    // Aggregate counts must retain undated legacy projects
    expect(story.stats).toContainEqual({ label: "Repositories", value: "3" });
    expect(story.stats).toContainEqual({ label: "Total stars", value: "40" }); // 12 + 8 + 20
    expect(story.stats).toContainEqual({ label: "Languages", value: "2" }); // Python, TypeScript

    // Oldest chronological repo must be dated-first-repo (April 2023), NOT the legacy empty-string date repo
    const ch1 = story.chapters.find((c) => c.index === 1);
    expect(ch1?.paragraphs[0]).toContain("Dated First Repo");
    expect(ch1?.paragraphs[0]).toContain("April 2023");
    expect(ch1?.stats).toContainEqual({ label: "Started", value: "April 2023" });
    expect(ch1?.stats).toContainEqual({ label: "First language", value: "TypeScript" });

    // Years active must be a finite number computed from dated-first-repo, not 0 or NaN
    const ch4 = story.chapters.find((c) => c.index === 4);
    const yearsActiveStat = ch4?.stats.find((s) => s.label === "Years active");
    expect(yearsActiveStat).toBeDefined();
    expect(Number(yearsActiveStat?.value)).toBeGreaterThanOrEqual(1);
    expect(Number.isNaN(Number(yearsActiveStat?.value))).toBe(false);
  });

  it("safely handles repositories when none have valid creation dates", () => {
    const undatedRepo1 = makeRepo({
      name: "legacy-one",
      created_at: "",
      language: "Go",
      stargazers_count: 4,
    });
    const undatedRepo2 = makeRepo({
      name: "legacy-two",
      created_at: "not-a-valid-date",
      language: "Go",
      stargazers_count: 6,
    });

    const story = buildJourneyStory(MOCK_USER, [undatedRepo1, undatedRepo2]);

    expect(story.hadHistory).toBe(true);
    expect(story.stats).toContainEqual({ label: "Repositories", value: "2" });
    expect(story.stats).toContainEqual({ label: "Total stars", value: "10" });

    // Chapter 1 date safely falls back to "A while ago"
    const ch1 = story.chapters.find((c) => c.index === 1);
    expect(ch1?.paragraphs[0]).toContain("created in A while ago");
    expect(ch1?.stats).toContainEqual({ label: "Started", value: "A while ago" });

    // Chapter 4 years active should safely be 0 without NaN
    const ch4 = story.chapters.find((c) => c.index === 4);
    expect(ch4?.stats).toContainEqual({ label: "Years active", value: "0" });
  });

  it("returns unwritten story when repos list is empty", () => {
    const story = buildJourneyStory(MOCK_USER, []);
    expect(story.hadHistory).toBe(false);
    expect(story.chapters).toHaveLength(1);
    expect(story.chapters[0].title).toBe("A Story Waiting to Begin");
  });

  it("excludes forked and archived repositories", () => {
    const repos = [
      makeRepo({ name: "forked-repo", fork: true }),
      makeRepo({ name: "archived-repo", archived: true }),
      makeRepo({ name: "own-repo", fork: false, archived: false }),
    ];

    const story = buildJourneyStory(MOCK_USER, repos);
    expect(story.stats).toContainEqual({ label: "Repositories", value: "1" });
  });
});
