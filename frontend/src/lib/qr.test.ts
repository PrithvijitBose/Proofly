import { describe, it, expect } from "vitest";
import { generateQRCodeSvg, generateQRCodeDataUri } from "./qr";

describe("QR Code Engine", () => {
  it("renders a valid standalone SVG string for public profile URL", async () => {
    const url = "https://proofly-omega.vercel.app/u/torvalds";
    const svg = await generateQRCodeSvg(url, {
      size: 256,
      darkColor: "#000000",
      lightColor: "#FFFFFF",
    });

    expect(svg).toBeDefined();
    expect(svg).toContain("<svg");
    expect(svg).toContain('viewBox="0 0');
    expect(svg).toContain("</svg>");
  });

  it("generates a high-resolution PNG data URI for downloading", async () => {
    const url = "https://proofly-omega.vercel.app/u/prithvijit";
    const dataUri = await generateQRCodeDataUri(url, { size: 512 });

    expect(dataUri).toBeDefined();
    expect(dataUri.startsWith("data:image/png;base64,")).toBe(true);
  });
});
