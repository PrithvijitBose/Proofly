import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareProfileModal } from "./share-profile-modal";

describe("ShareProfileModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ShareProfileModal
        isOpen={false}
        onClose={() => {}}
        username="octocat"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders QR code and public URL when isOpen is true", () => {
    render(
      <ShareProfileModal
        isOpen={true}
        onClose={() => {}}
        username="octocat"
        name="The Octocat"
      />
    );

    expect(screen.getByText("Share Public Identity")).toBeDefined();
    expect(screen.getByText("Local Wi-Fi (Phone)")).toBeDefined();
    expect(screen.getByText("Live Cloud (Vercel)")).toBeDefined();
    expect(screen.getByText("Share on X")).toBeDefined();
    expect(screen.getByText("Share LinkedIn")).toBeDefined();
  });

  it("switches to live cloud domain when preset is clicked", () => {
    render(
      <ShareProfileModal
        isOpen={true}
        onClose={() => {}}
        username="octocat"
      />
    );

    const cloudBtn = screen.getByText("Live Cloud (Vercel)");
    fireEvent.click(cloudBtn);

    expect(
      screen.getByDisplayValue("https://proofly-omega.vercel.app/u/octocat")
    ).toBeDefined();
  });

  it("calls onClose when close button or backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <ShareProfileModal
        isOpen={true}
        onClose={onClose}
        username="octocat"
      />
    );

    const closeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
