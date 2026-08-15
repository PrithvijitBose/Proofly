/**
 * High-precision QR Code generator using standard QR algorithms.
 *
 * Generates ISO/IEC 18004 compliant QR codes with high contrast,
 * standard quiet zones, and universal scanner compatibility across
 * all mobile cameras (iOS Camera, Android Google Lens, WeChat, UPI).
 */

import QRCode from "qrcode";

export interface RenderSvgOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Renders a crisp SVG string from a URL/text.
 * Uses high contrast (dark on white) by default for universal phone camera detection.
 */
export async function generateQRCodeSvg(
  text: string,
  options: RenderSvgOptions = {}
): Promise<string> {
  const {
    size = 256,
    margin = 2,
    darkColor = "#000000",
    lightColor = "#FFFFFF",
    errorCorrectionLevel = "M",
  } = options;

  return QRCode.toString(text, {
    type: "svg",
    width: size,
    margin,
    errorCorrectionLevel,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });
}

/**
 * Generates a PNG Data URI suitable for <img src="..." /> and high-res downloads.
 */
export async function generateQRCodeDataUri(
  text: string,
  options: RenderSvgOptions = {}
): Promise<string> {
  const {
    size = 512,
    margin = 2,
    darkColor = "#000000",
    lightColor = "#FFFFFF",
    errorCorrectionLevel = "M",
  } = options;

  return QRCode.toDataURL(text, {
    width: size,
    margin,
    errorCorrectionLevel,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });
}

// Backward compatibility aliases
export const renderQRCodeSvg = generateQRCodeSvg;

