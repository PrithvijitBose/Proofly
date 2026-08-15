"use client";

import { useEffect, useState } from "react";
import { generateQRCodeSvg, generateQRCodeDataUri } from "@/lib/qr";
import { Download, Copy, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  showControls?: boolean;
  username?: string;
}

export function QRCodeDisplay({
  url,
  size = 230,
  showControls = true,
  username = "developer",
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [svgString, setSvgString] = useState<string>("");
  const [dataUri, setDataUri] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    // Use pure black on white for 100% instant optical recognition by all phone cameras
    generateQRCodeSvg(url, {
      size,
      margin: 2,
      darkColor: "#000000",
      lightColor: "#FFFFFF",
      errorCorrectionLevel: "M",
    }).then((svg) => {
      if (!cancelled) setSvgString(svg);
    }).catch(() => {});

    generateQRCodeDataUri(url, {
      size: 512,
      margin: 3,
      darkColor: "#000000",
      lightColor: "#FFFFFF",
      errorCorrectionLevel: "M",
    }).then((uri) => {
      if (!cancelled) setDataUri(uri);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [url, size]);

  const handleDownloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `proofly-${username}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownloadPng = () => {
    if (!dataUri) return;
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = `proofly-${username}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* High-Contrast QR Code Card */}
      <div className="relative rounded-2xl border-2 border-proof-amber/40 bg-white p-3 shadow-2xl shadow-proof-amber/20 transition-all hover:scale-[1.01]">
        {svgString ? (
          <div
            className="flex items-center justify-center overflow-hidden rounded-lg bg-white"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-white rounded-lg text-slate-400 font-mono text-xs animate-pulse"
          >
            GENERATING_QR...
          </div>
        )}
      </div>

      {showControls && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            className="text-xs border-proof-border hover:border-proof-amber/50 font-mono"
          >
            {copied ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-proof-emerald" />
                Copied Link
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5 text-proof-ash" />
                Copy URL
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSvg}
            className="text-xs border-proof-border hover:border-proof-amber/50 font-mono"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-proof-ash" />
            SVG
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPng}
            className="text-xs border-proof-border hover:border-proof-amber/50 font-mono"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-proof-ash" />
            PNG
          </Button>
        </div>
      )}
    </div>
  );
}
