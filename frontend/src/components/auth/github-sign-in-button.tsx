"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { PatSignInModal } from "./pat-sign-in-modal";
import { Key } from "lucide-react";

export function GitHubSignInButton({
  label = "Connect GitHub",
  callbackUrl = "/journey",
  className,
  showPatOption = true,
  hasExistingPat,
  wrapperClassName,
}: {
  label?: string;
  callbackUrl?: string;
  className?: string;
  showPatOption?: boolean;
  hasExistingPat?: boolean;
  wrapperClassName?: string;
}) {
  const [patModalOpen, setPatModalOpen] = useState(false);

  return (
    <div className={wrapperClassName ?? "flex flex-col sm:flex-row items-center gap-2"}>
      <button
        type="button"
        onClick={() => signIn("github", { callbackUrl })}
        className={
          className ??
          "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
        }
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
        </svg>
        {label}
      </button>

      {showPatOption && (
        <>
          <button
            type="button"
            onClick={() => setPatModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-proof-amber transition-colors px-2 py-1 whitespace-nowrap"
            title="Use custom GitHub Personal Access Token (Option B)"
          >
            <Key className="h-3 w-3 text-proof-amber" />
            <span>Use PAT</span>
          </button>

          <PatSignInModal
            isOpen={patModalOpen}
            onClose={() => setPatModalOpen(false)}
            hasExistingPat={hasExistingPat}
            callbackUrl={callbackUrl}
          />
        </>
      )}
    </div>
  );
}