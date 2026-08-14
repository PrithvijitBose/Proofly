import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JourneyCustomizer } from "./journey-customizer";

describe("JourneyCustomizer", () => {
  it("renders collapsed initially with current tone and opens on click", () => {
    const onRegenerate = vi.fn();
    render(
      <JourneyCustomizer
        currentTone="Professional"
        currentPrompt=""
        isGenerating={false}
        onRegenerate={onRegenerate}
      />
    );

    expect(screen.getByText("Customize Story & Tone")).toBeDefined();
    expect(screen.getByText("Professional")).toBeDefined();

    // Click customize button to expand
    fireEvent.click(screen.getByText("Customize Story & Tone"));

    expect(screen.getByText("Select Tone Preset")).toBeDefined();
    expect(screen.getByText("Technical")).toBeDefined();
    expect(screen.getByText("Concise")).toBeDefined();
  });

  it("selects a tone preset, edits prompt, and submits regeneration", () => {
    const onRegenerate = vi.fn();
    render(
      <JourneyCustomizer
        currentTone="Professional"
        currentPrompt="Initial prompt"
        isGenerating={false}
        onRegenerate={onRegenerate}
      />
    );

    // Expand
    fireEvent.click(screen.getByText("Customize Story & Tone"));

    // Select Technical tone
    fireEvent.click(screen.getByText("Technical"));

    // Edit textarea
    const textarea = screen.getByPlaceholderText(/e\.g\. Make this professional/i);
    fireEvent.change(textarea, { target: { value: "Focus on open source tools" } });

    // Submit form
    fireEvent.click(screen.getByText("Regenerate Story"));

    expect(onRegenerate).toHaveBeenCalledWith({
      tone: "Technical",
      customPrompt: "Focus on open source tools",
    });
  });
});
