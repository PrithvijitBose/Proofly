"use client";

import { useEffect, useState } from "react";
import {
  X,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Smartphone,
  Globe,
  Wifi,
  Laptop,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeDisplay } from "./qr-code-display";
import { DEFAULT_PRODUCTION_APP_URL, env } from "@/config/env";

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  name?: string | null;
  customUrl?: string;
}

type DomainPreset = "production" | "wifi" | "localhost" | "custom";

export function ShareProfileModal({
  isOpen,
  onClose,
  username,
  name,
  customUrl,
}: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activePreset, setActivePreset] = useState<DomainPreset>("wifi");
  const [customDomainInput, setCustomDomainInput] = useState<string>("");
  const [localIp, setLocalIp] = useState<string>("192.168.31.221");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        setLocalIp(hostname);
      }
    }
  }, []);

  if (!isOpen || !mounted) return null;

  const currentLocalOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : ":3000";
  const wifiNetworkOrigin = `http://${localIp}${port}`;

  // Compute active base origin safely
  let activeBaseOrigin = wifiNetworkOrigin;

  if (activePreset === "production") {
    activeBaseOrigin = DEFAULT_PRODUCTION_APP_URL;
  } else if (activePreset === "wifi") {
    activeBaseOrigin = wifiNetworkOrigin;
  } else if (activePreset === "localhost") {
    activeBaseOrigin = currentLocalOrigin;
  } else if (activePreset === "custom") {
    const raw = customDomainInput.trim();
    if (raw) {
      // Auto-prefix protocol if missing
      activeBaseOrigin = raw.startsWith("http://") || raw.startsWith("https://")
        ? raw.replace(/\/+$/, "")
        : `https://${raw.replace(/\/+$/, "")}`;
    } else {
      activeBaseOrigin = wifiNetworkOrigin;
    }
  }

  const profileUrl = `${activeBaseOrigin.replace(/\/+$/, "")}/u/${encodeURIComponent(username)}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Check out my verified developer identity and GitHub story on @ProoflyDev:\n${profileUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(profileUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Modal */}
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-proof-border bg-proof-dark p-6 sm:p-7 shadow-2xl transition-all no-scrollbar">
        {/* Glow corner */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-proof-amber/20 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-proof-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-proof-amber/10 text-proof-amber border border-proof-amber/30">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Share Public Identity</h2>
              <p className="text-[11px] text-proof-ash font-mono">Instant Universal QR Code & Shareable Link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-proof-ash hover:bg-proof-obsidian hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-5 pt-4 text-center">
          {/* Target Host Presets */}
          <div className="rounded-2xl border border-proof-border/80 bg-proof-obsidian p-3 space-y-2.5 text-left">
            <label className="text-[11px] font-mono font-bold uppercase text-proof-ash flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-proof-amber" />
              Choose Scanning Target Destination:
            </label>

            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: Local Wi-Fi (Recommended for local phone scan) */}
              <button
                type="button"
                onClick={() => setActivePreset("wifi")}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-xs font-mono transition-all ${
                  activePreset === "wifi"
                    ? "border-proof-amber bg-proof-amber/10 text-proof-amber shadow-sm shadow-proof-amber/20"
                    : "border-proof-border bg-proof-dark text-proof-ash hover:text-white"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Wifi className="h-3.5 w-3.5 text-proof-emerald" />
                  <span>Local Wi-Fi (Phone)</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                  {localIp}:3000
                </span>
              </button>

              {/* Option 2: Live Cloud */}
              <button
                type="button"
                onClick={() => setActivePreset("production")}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-xs font-mono transition-all ${
                  activePreset === "production"
                    ? "border-proof-amber bg-proof-amber/10 text-proof-amber shadow-sm shadow-proof-amber/20"
                    : "border-proof-border bg-proof-dark text-proof-ash hover:text-white"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Radio className="h-3.5 w-3.5 text-proof-cyan" />
                  <span>Live Cloud (Vercel)</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                  proofly-omega.vercel.app
                </span>
              </button>
            </div>

            {/* Custom Domain Input option */}
            <div className="pt-2 border-t border-proof-border/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-proof-ash uppercase">Or Custom Domain / IP:</span>
                {activePreset === "custom" && customDomainInput && (
                  <button
                    onClick={() => {
                      setCustomDomainInput("");
                      setActivePreset("wifi");
                    }}
                    className="text-[10px] text-red-400 hover:underline font-mono"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="text"
                value={customDomainInput}
                onChange={(e) => {
                  setCustomDomainInput(e.target.value);
                  setActivePreset("custom");
                }}
                placeholder="e.g. 192.168.31.221:3000 or https://myportfolio.com"
                className="w-full rounded-lg border border-proof-border bg-proof-dark px-3 py-1.5 text-xs text-white font-mono placeholder:text-slate-500 focus:border-proof-amber focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Scan Notice */}
          <div className="flex items-center justify-center gap-2 rounded-xl border border-proof-emerald/30 bg-proof-emerald/10 px-3 py-2 text-xs text-proof-emerald">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>
              {activePreset === "wifi"
                ? "Phone & laptop must be on the same Wi-Fi network"
                : activePreset === "production"
                ? "Opens live cloud deployment on Vercel"
                : "Scannable on any camera"}
            </span>
          </div>

          {/* High-Contrast QR Code Display */}
          <div className="flex justify-center">
            <QRCodeDisplay
              url={profileUrl}
              username={username}
              size={210}
              showControls={true}
            />
          </div>

          {/* Direct URL Box */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-proof-ash">
                Target URL:
              </label>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-proof-cyan hover:underline flex items-center gap-1 font-mono"
              >
                <span>Test in Browser</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-proof-border bg-proof-obsidian p-1.5 pl-3">
              <input
                type="text"
                readOnly
                value={profileUrl}
                className="w-full bg-transparent font-mono text-xs text-slate-200 focus:outline-none select-all"
              />
              <Button
                size="sm"
                onClick={handleCopyUrl}
                className="shrink-0 bg-proof-amber text-black hover:bg-proof-amber/90 text-xs font-semibold px-3 py-1.5 h-auto rounded-lg"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareTwitter}
              className="text-xs border-proof-border hover:border-proof-amber/50 font-mono"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5 text-proof-ash" />
              Share on X
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLinkedIn}
              className="text-xs border-proof-border hover:border-proof-amber/50 font-mono"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-proof-ash" />
              Share LinkedIn
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
