import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PublicProfileView } from "./public-profile-view";
import type { PublicProfile } from "@/lib/github/profile-store";

const mockProfile: PublicProfile = {
  username: "octocat",
  name: "The Octocat",
  avatarUrl: "https://avatars.githubusercontent.com/u/583231",
  bio: "Building cool open source things",
  location: "San Francisco",
  company: "GitHub",
  blog: "https://github.blog",
  publicRepos: 8,
  followers: 5000,
  following: 9,
  createdAt: "2011-01-25T18:44:36Z",
  narrative: {
    chapters: [
      {
        index: 1,
        title: "The Octoverse Genesis",
        kicker: "first commit",
        claims: [
          {
            text: "Engineered scalable git hosting architecture.",
            evidenceIds: ["commit:octocat/Hello-World:7fd1a60"],
            verified: true,
          },
        ],
      },
    ],
    summary: "A leader in open source collaboration.",
    verifiedClaimCount: 1,
    droppedClaimCount: 0,
    dropReasons: [],
  },
  tone: "Technical",
  isApproved: true,
  curatedProjects: [
    {
      repoId: 1296269,
      name: "Hello-World",
      fullName: "octocat/Hello-World",
      htmlUrl: "https://github.com/octocat/Hello-World",
      description: "My first repository on GitHub!",
      language: "JavaScript",
      stargazersCount: 2500,
      forksCount: 1800,
      pushedAt: "2026-01-01T00:00:00Z",
      customNote: "Foundational example repo",
      priority: 1,
    },
  ],
  evidence: [],
  patterns: [],
  publishedAt: "2026-08-15T12:00:00Z",
  canonicalUrl: "http://localhost:3000/u/octocat",
};

describe("PublicProfileView Component", () => {
  it("renders the developer name, username, and bio", () => {
    render(<PublicProfileView profile={mockProfile} />);

    expect(screen.getByText("The Octocat")).toBeDefined();
    expect(screen.getByText("@octocat")).toBeDefined();
    expect(screen.getByText("Building cool open source things")).toBeDefined();
  });

  it("renders verified narrative chapter and claims", () => {
    render(<PublicProfileView profile={mockProfile} />);

    expect(screen.getByText("The Octoverse Genesis")).toBeDefined();
    expect(screen.getByText("first commit")).toBeDefined();
    expect(
      screen.getByText("Engineered scalable git hosting architecture.")
    ).toBeDefined();
    expect(screen.getByText("commit:octocat/Hello-World:7fd1a60")).toBeDefined();
  });

  it("renders curated projects with custom developer notes", () => {
    render(<PublicProfileView profile={mockProfile} />);

    expect(screen.getByText("Hello-World")).toBeDefined();
    expect(screen.getByText("Foundational example repo")).toBeDefined();
    expect(screen.getByText("JavaScript")).toBeDefined();
    expect(screen.getAllByText("2500").length).toBeGreaterThanOrEqual(1);
  });

  it("opens the Share & QR Code modal when clicked", () => {
    render(<PublicProfileView profile={mockProfile} />);

    const shareButton = screen.getByText("Share & QR Code");
    fireEvent.click(shareButton);

    expect(screen.getByText("Share Public Identity")).toBeDefined();
    expect(screen.getByText("Local Wi-Fi (Phone)")).toBeDefined();
  });

  it("shows owner preview banner only when isOwner is true", () => {
    const { rerender } = render(
      <PublicProfileView profile={mockProfile} isOwner={false} />
    );
    expect(screen.queryByText(/You are previewing your live public profile/i)).toBeNull();

    rerender(<PublicProfileView profile={mockProfile} isOwner={true} />);
    expect(screen.getByText(/You are previewing your live public profile/i)).toBeDefined();
  });
});
