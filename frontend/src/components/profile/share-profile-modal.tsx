"use client";

import { useEffect, useState, useRef } from "react";
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
  const [activePreset, setActivePreset] = useState<DomainPreset>(
    customUrl ? "custom" : "production"
  );
  const [customDomainInput, setCustomDomainInput] = useState<string>(
    customUrl ? customUrl.replace(/\/u\/[^/]+$/, "") : ""
  );
  const [configuredLanIp, setConfiguredLanIp] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (
        hostname !== "localhost" &&
        hostname !== "127.0.0.1" &&
        /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
      ) {
        setConfiguredLanIp(hostname);
      }
    }
  }, []);

  // Focus trap, Escape key handling, and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element before opening
    if (typeof document !== "undefined") {
      previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
    }

    // Move initial focus into modal
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElement.current && typeof previouslyFocusedElement.current.focus === "function") {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const publicServingOrigin =
    customUrl ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : DEFAULT_PRODUCTION_APP_URL);

  const port =
    typeof window !== "undefined" && window.location.port
      ? `:${window.location.port}`
      : ":3000";
  const wifiNetworkOrigin = configuredLanIp ? `http://${configuredLanIp}${port}` : null;

  // Compute active base origin safely — defaults to public serving destination
  let activeBaseOrigin = DEFAULT_PRODUCTION_APP_URL;

  if (activePreset === "production") {
    activeBaseOrigin = DEFAULT_PRODUCTION_APP_URL;
  } else if (activePreset === "wifi") {
    activeBaseOrigin = wifiNetworkOrigin || (typeof window !== "undefined" ? window.location.origin : DEFAULT_PRODUCTION_APP_URL);
  } else if (activePreset === "localhost") {
    activeBaseOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  } else if (activePreset === "custom") {
    const raw = customDomainInput.trim();
    if (raw) {
      activeBaseOrigin =
        raw.startsWith("http://") || raw.startsWith("https://")
          ? raw.replace(/\/+$/, "")
          : `https://${raw.replace(/\/+$/, "")}`;
    } else {
      activeBaseOrigin = publicServingOrigin;
    }
  }

  const profileUrl =
    activePreset === "custom" && customUrl && !customDomainInput.trim()
      ? customUrl
      : `${activeBaseOrigin.replace(/\/+$/, "")}/u/${encodeURIComponent(username)}`;

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
        data-testid="modal-backdrop"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-proof-border bg-proof-dark p-6 sm:p-7 shadow-2xl transition-all no-scrollbar outline-none"
      >
        {/* Glow corner */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-proof-amber/20 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-proof-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-proof-amber/10 text-proof-amber border border-proof-amber/30">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h2 id="share-dialog-title" className="text-base font-bold text-white font-display">
                Share Public Identity
              </h2>
              <p className="text-[11px] text-proof-ash font-mono">Instant Universal QR Code & Shareable Link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close share modal"
            className="rounded-full p-2 text-proof-ash hover:bg-proof-border/50 hover:text-white transition-colors"
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
              {/* Option 1: Local Wi-Fi (Available when on local network) */}
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
                  {configuredLanIp ? `${configuredLanIp}${port}` : "Local Network"}
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
                      setActivePreset("production");
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
                placeholder="e.g. https://proofly.dev or https://myportfolio.com"
                className="w-full rounded-xl border border-proof-border bg-proof-dark px-3 py-2 text-xs font-mono text-white placeholder:text-proof-ash/60 focus:border-proof-amber focus:outline-none"
              />
            </div>
          </div>

          {/* QR Code Canvas Card */}
          <div className="flex justify-center">
            <QRCodeDisplay
              url={profileUrl}
              username={username}
              size={220}
              showControls={true}
            />
          </div>

          {/* Share Actions Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={profileUrl}
                className="w-full rounded-xl border border-proof-border bg-proof-obsidian px-3.5 py-2.5 text-xs font-mono text-slate-300 select-all focus:outline-none"
              />
              <Button
                variant="outline"
                onClick={handleCopyUrl}
                className="shrink-0 gap-1.5 border-proof-border bg-proof-dark hover:border-proof-amber hover:text-proof-amber"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-proof-emerald" />
                    <span className="text-xs font-mono text-proof-emerald">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="text-xs font-mono">Copy</span>
                  </>
                )}
              </Button>
            </div>

            {/* Test Link Button */}
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-proof-amber/40 bg-proof-amber/10 py-2.5 text-xs font-bold text-proof-amber transition-all hover:bg-proof-amber/20"
            >
              <span>Test in Browser</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                onClick={handleShareTwitter}
                className="w-full gap-2 border-proof-border bg-proof-obsidian text-xs font-mono text-slate-300 hover:border-proof-cyan hover:text-white"
              >
                <Share2 className="h-3.5 w-3.5 text-proof-cyan" />
                Share on X
              </Button>
              <Button
                variant="outline"
                onClick={handleShareLinkedIn}
                className="w-full gap-2 border-proof-border bg-proof-obsidian text-xs font-mono text-slate-300 hover:border-proof-cyan hover:text-white"
              >
                <Share2 className="h-3.5 w-3.5 text-proof-cyan" />
                Share LinkedIn
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
