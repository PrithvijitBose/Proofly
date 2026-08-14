import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NarrativeEditor } from "./narrative-editor";
import type { GuardedNarrative } from "@/lib/github/guardrails";

const mockNarrative: GuardedNarrative = {
  chapters: [
    {
      index: 1,
      title: "The First Line",
      kicker: "where it began",
      claims: [
        {
          text: "Started writing TypeScript in 2023.",
          evidenceIds: ["commit:user/repo:1"],
          verified: true,
        },
      ],
    },
  ],
  verifiedClaimCount: 1,
  droppedClaimCount: 0,
  dropReasons: [],
};

describe("NarrativeEditor", () => {
  it("renders chapter titles, kickers, and sentences for editing", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <NarrativeEditor
        initialNarrative={mockNarrative}
        evidence={[]}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText("Manual Story Editor")).toBeDefined();
    expect(screen.getByDisplayValue("The First Line")).toBeDefined();
    expect(screen.getByDisplayValue("where it began")).toBeDefined();
    expect(screen.getByDisplayValue("Started writing TypeScript in 2023.")).toBeDefined();
  });

  it("allows modifying fields, adding a sentence, and saving the updated narrative", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <NarrativeEditor
        initialNarrative={mockNarrative}
        evidence={[]}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    // Edit chapter title
    const titleInput = screen.getByDisplayValue("The First Line");
    fireEvent.change(titleInput, { target: { value: "A New Beginning" } });

    // Edit claim text
    const claimInput = screen.getByDisplayValue("Started writing TypeScript in 2023.");
    fireEvent.change(claimInput, { target: { value: "Started writing Rust in 2023." } });

    // Add a sentence
    fireEvent.click(screen.getByText("Add Sentence"));

    // Save
    const saveButtons = screen.getAllByText("Save & Approve Story");
    fireEvent.click(saveButtons[0]);

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as GuardedNarrative;
    expect(saved.chapters[0].title).toBe("A New Beginning");
    expect(saved.chapters[0].claims[0].text).toBe("Started writing Rust in 2023.");
    expect(saved.chapters[0].claims).toHaveLength(2);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <NarrativeEditor
        initialNarrative={mockNarrative}
        evidence={[]}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
