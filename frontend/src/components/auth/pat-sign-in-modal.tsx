"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPatTokenAction, clearPatTokenAction } from "@/lib/auth/pat-token";
import { Key, X, Check, ShieldAlert } from "lucide-react";

interface PatSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingPat?: boolean;
}

export function PatSignInModal({ isOpen, onClose, hasExistingPat = false }: PatSignInModalProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

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
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
      triggerElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError("Please enter a valid GitHub token.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await setPatTokenAction(tokenInput);
      if (!res.success) {
        setError(res.error || "Failed to save token.");
        setLoading(false);
        return;
      }
      onClose();
      router.push("/journey");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pat-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-proof-border bg-proof-obsidian p-6 shadow-2xl"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pat-token-input" className="block text-xs font-mono text-slate-300 mb-1.5">
              Paste Token (<code className="text-proof-amber">ghp_...</code> or <code className="text-proof-amber">github_pat_...</code>)
            </label>
            <input
              id="pat-token-input"
              ref={inputRef}
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-lg border border-proof-border bg-proof-carbon px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-proof-amber focus:outline-none"
            />
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

          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

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
    </div>
  );
}
