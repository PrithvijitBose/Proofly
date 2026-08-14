"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPatTokenAction, clearPatTokenAction } from "@/lib/auth/pat-token";
import { Key, X, Check, ShieldAlert, Eye, EyeOff } from "lucide-react";

interface PatSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingPat?: boolean;
  callbackUrl?: string;
  /** When true, shows a banner explaining OAuth is not configured. */
  showOAuthWarning?: boolean;
}

export function PatSignInModal({
  isOpen,
  onClose,
  hasExistingPat = false,
  callbackUrl = "/journey",
  showOAuthWarning = false,
}: PatSignInModalProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      triggerElementRef.current?.focus();
      triggerElementRef.current = null;
    }
    prevIsOpenRef.current = isOpen;

    if (!isOpen) {
      setTokenInput("");
      setError(null);
      return;
    }

    // Capture triggering element to restore focus when modal closes
    triggerElementRef.current = document.activeElement as HTMLElement | null;

    // Move initial focus into input field
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();

    if (!trimmed) {
      setError("Please enter a valid GitHub token.");
      return;
    }

    // Format validation — GitHub PATs always have a known prefix
    if (!trimmed.startsWith("ghp_") && !trimmed.startsWith("github_pat_")) {
      setError(
        "Invalid token format. GitHub tokens must start with ghp_ (classic) or github_pat_ (fine-grained)."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify against GitHub API before saving
      const verifyRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${trimmed}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!verifyRes.ok) {
        if (verifyRes.status === 401) {
          setError("GitHub rejected this token — it may be expired or revoked. Generate a new one.");
        } else if (verifyRes.status === 403) {
          setError("Token lacks required permissions. Ensure it has read:user and repo scopes.");
        } else {
          setError(`GitHub returned an error (${verifyRes.status}). Please try again.`);
        }
        setLoading(false);
        return;
      }

      const ghUser = await verifyRes.json();

      // Save the verified token to the cookie
      const res = await setPatTokenAction(trimmed);
      if (!res.success) {
        setError(res.error || "Failed to save token.");
        setLoading(false);
        return;
      }

      // Success — show the user's login before redirecting
      console.log(`[PAT] Verified as @${ghUser.login}`);
      onClose();
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Network error — could not reach GitHub. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setError(null);
    try {
      await clearPatTokenAction();
      onClose();
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pat-modal-title"
        className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-proof-border bg-proof-obsidian p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-proof-amber/10 text-proof-amber border border-proof-amber/30">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h3 id="pat-modal-title" className="font-display text-lg font-bold text-white">
              GitHub Personal Access Token
            </h3>
            <p className="text-xs text-slate-400">For self-hosting & power users (Option B)</p>
          </div>
        </div>

        {showOAuthWarning && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 space-y-1 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span>GitHub OAuth is not configured</span>
            </div>
            <p className="text-amber-300/80 pl-5">
              No <code className="text-amber-400">GITHUB_ID</code> / <code className="text-amber-400">GITHUB_SECRET</code> environment variables detected.
              Use a Personal Access Token below to authenticate locally.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pat-token-input" className="block text-xs font-mono text-slate-300 mb-1.5">
              Paste Token (<code className="text-proof-amber">ghp_...</code> or <code className="text-proof-amber">github_pat_...</code>)
            </label>
            <div className="relative">
              <input
                id="pat-token-input"
                ref={inputRef}
                type={showToken ? "text" : "password"}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "pat-token-error" : undefined}
                className="w-full rounded-lg border border-proof-border bg-proof-carbon pl-3 pr-10 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-proof-amber focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-proof-amber font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Required Scopes:</span>
            </div>
            <p className="font-mono text-slate-300 pl-5">read:user, repo (public_repo)</p>
            <p className="text-slate-400 pt-1">
              Token is stored in a persistent 30-day HTTP-only cookie.
            </p>
          </div>

          {error && (
            <p id="pat-token-error" role="alert" aria-live="assertive" className="text-xs text-red-400 font-mono">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            {hasExistingPat ? (
              <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={loading} className="text-xs text-red-400 border-red-900/50 hover:bg-red-950/50">
                Remove Token
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="amber" size="sm" disabled={loading} className="text-xs font-bold gap-1.5">
                {loading ? "Saving..." : "Use PAT Token"}
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
