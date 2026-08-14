import { beforeEach, describe, expect, it } from "vitest";
import {
  clearApprovedJourney,
  loadApprovedJourney,
  saveApprovedJourney,
  type ApprovedJourney,
} from "./custom-journey";
import type { GuardedNarrative } from "./guardrails";

const mockNarrative: GuardedNarrative = {
  chapters: [
    {
      index: 1,
      title: "My Custom Title",
      kicker: "my custom kicker",
      claims: [
        {
          text: "I built an innovative distributed system.",
          evidenceIds: ["commit:user/repo:123"],
          verified: true,
        },
      ],
    },
  ],
  verifiedClaimCount: 1,
  droppedClaimCount: 0,
  dropReasons: [],
};

describe("custom-journey storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no approved journey is saved", () => {
    expect(loadApprovedJourney("octocat")).toBeNull();
  });

  it("saves and loads an approved journey", () => {
    const journey: ApprovedJourney = {
      narrative: mockNarrative,
      isApproved: true,
      savedAt: "2026-08-14T12:00:00Z",
      tone: "Technical",
      customPrompt: "Focus on distributed systems",
    };

    saveApprovedJourney("octocat", journey);
    const loaded = loadApprovedJourney("octocat");

    expect(loaded).not.toBeNull();
    expect(loaded?.isApproved).toBe(true);
    expect(loaded?.tone).toBe("Technical");
    expect(loaded?.customPrompt).toBe("Focus on distributed systems");
    expect(loaded?.narrative.chapters[0].title).toBe("My Custom Title");
  });

  it("clears an approved journey", () => {
    const journey: ApprovedJourney = {
      narrative: mockNarrative,
      isApproved: true,
      savedAt: "2026-08-14T12:00:00Z",
    };

    saveApprovedJourney("octocat", journey);
    expect(loadApprovedJourney("octocat")).not.toBeNull();

    clearApprovedJourney("octocat");
    expect(loadApprovedJourney("octocat")).toBeNull();
  });
});
