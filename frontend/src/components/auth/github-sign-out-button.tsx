"use client";

import { signOut } from "next-auth/react";
import { clearPatTokenAction } from "@/lib/auth/pat-token";

export function GitHubSignOutButton({ className }: { className?: string }) {
  const handleSignOut = async () => {
    // Clear the PAT cookie first (server action), then clear the OAuth session
    try {
      await clearPatTokenAction();
    } catch {
      // PAT cookie may not exist — that's fine
    }
    signOut({ callbackUrl: "/" });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      }
    >
      Sign out
    </button>
  );
}