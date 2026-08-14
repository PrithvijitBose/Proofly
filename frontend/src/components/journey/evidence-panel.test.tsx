/**
 * Evidence panel tests — grouped evidence, zero-backing records, guardrail
 * summary line, empty state, and the export button (POST + download).
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { EvidencePanel } from "./evidence-panel";
import type { EvidenceRecord } from "@/lib/github/evidence";
import type { GuardedNarrative } from "@/lib/github/guardrails";
import type { GitHubUser } from "@/lib/github/client";
import type { CuratedProject } from "@/lib/github/curation";

const FETCHED_AT = "2026-01-15T12:00:00Z";

const user: GitHubUser = {
  login: "userA",
  name: "User A",
  avatar_url: "https://example.com/avatarA.png",
  bio: null,
  company: null,
  blog: null,
  location: null,
  public_repos: 1,
  followers: 1,
  following: 0,
  created_at: "2020-01-01T00:00:00Z",
};

const repos: CuratedProject[] = [
  {
    repoId: 101,
    name: "repo-a",
    fullName: "userA/repo-a",
    htmlUrl: "https://github.com/userA/repo-a",
    description: null,
    language: "TypeScript",
    stargazersCount: 50,
    forksCount: 5,
    pushedAt: "2026-01-01T00:00:00Z",
    customNote: "",
    priority: 1,
  },
];

const commitRecord: EvidenceRecord = {
  id: "commit:userA/repo-a:abc1234",
  source: "commit",
  repoFullName: "userA/repo-a",
  url: "https://github.com/userA/repo-a/commit/abc1234",
  title: "Add login flow",
  detail: null,
  date: "2023-03-01T00:00:00Z",
  meta: { sha: "abc1234", message: "Add login flow" },
  fetchedAt: FETCHED_AT,
};

const uncitedRecord: EvidenceRecord = {
  ...commitRecord,
  id: "commit:userA/repo-a:deadbeef",
  url: "https://github.com/userA/repo-a/commit/deadbeef",
  title: "Uncited refactor",
  meta: { sha: "deadbeef", message: "Uncited refactor" },
};

const narrative: GuardedNarrative = {
  chapters: [
    {
      index: 1,
      title: "The beginning",
      kicker: "first line",
      claims: [
        { text: "Started in March 2023.", evidenceIds: ["commit:userA/repo-a:abc1234"], verified: true },
        {
          text: "Reached 3 stars.",
          evidenceIds: ["commit:userA/repo-a:abc1234"],
          verified: false,
          flagged: ["number 3 does not appear in the cited evidence"],
        },
      ],
    },
  ],
  verifiedClaimCount: 1,
  droppedClaimCount: 0,
  dropReasons: [],
};

function panel(evidence: EvidenceRecord[], warnings: string[] = []) {
  return render(
    <EvidencePanel
      user={user}
      repos={repos}
      patterns={[]}
      narrative={narrative}
      evidence={evidence}
      warnings={warnings}
    />
  );
}

describe("EvidencePanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("groups evidence by repository and links records to GitHub", () => {
    panel([commitRecord]);
    expect(screen.getByText("userA/repo-a")).toBeTruthy();
    const recordLink = screen.getByText("Add login flow");
    expect(recordLink.closest("a")?.getAttribute("href")).toBe(commitRecord.url);
  });

  it("shows zero-backing records dimmed with a 'not cited' tag", () => {
    panel([commitRecord, uncitedRecord]);
    expect(screen.getByText("not cited")).toBeTruthy();
    expect(screen.getByText("Uncited refactor")).toBeTruthy();
  });

  it("renders the guardrail summary line", () => {
    panel([commitRecord]);
    expect(screen.getByText("1 of 2 claims verified against GitHub evidence")).toBeTruthy();
  });

  it("renders gather warnings", () => {
    panel([commitRecord], ["Could not read repo-a issues"]);
    expect(screen.getByText(/Could not read repo-a issues/)).toBeTruthy();
  });

  it("shows the empty state with a curation link when there is no evidence", () => {
    panel([]);
    expect(
      screen.getByText(/Not enough evidence to write a journey yet — curate more repositories on the projects page/)
    ).toBeTruthy();
    const link = screen.getByText("Curate repositories").closest("a");
    expect(link?.getAttribute("href")).toBe("/projects");
  });

  it("exports the bundle via POST and triggers a download", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["{}"], { type: "application/json" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clicked: { anchor?: HTMLAnchorElement } = {};
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.anchor = this;
      });

    panel([commitRecord]);
    fireEvent.click(screen.getByText("Export journey JSON"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/journey/export", expect.objectContaining({ method: "POST" }));
    });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.repos[0].fullName).toBe("userA/repo-a");
    expect(body.narrative.chapters).toHaveLength(1);
    expect(body.evidence).toHaveLength(1);

    expect(clickSpy).toHaveBeenCalled();
    expect(clicked.anchor?.download).toBe("proofly-journey-userA.json");
    expect(clicked.anchor?.href).toBe("blob:mock");
  });

  it("surfaces export errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Cannot export: narrative cites evidence missing from the bundle." }),
      })
    );

    panel([commitRecord]);
    fireEvent.click(screen.getByText("Export journey JSON"));

    await waitFor(() => {
      expect(screen.getByText(/Cannot export: narrative cites evidence missing from the bundle/)).toBeTruthy();
    });
  });
});