"use client";

import { signOut } from "next-auth/react";

export function GitHubSignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      }
    >
      Sign out
    </button>
  );
}