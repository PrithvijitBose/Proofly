"use server";

import { cookies } from "next/headers";

const PAT_COOKIE_NAME = "proofly_pat_token";

/**
 * Server-only helper: Reads the custom GitHub Personal Access Token (PAT)
 * set by users who choose PAT authentication over OAuth.
 */
export async function getPatToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const pat = cookieStore.get(PAT_COOKIE_NAME)?.value;
  return pat ? pat.trim() : null;
}

/**
 * Server action: Saves a GitHub Personal Access Token in an HTTP-only cookie.
 */
export async function setPatTokenAction(pat: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = pat.trim();
  if (!trimmed) {
    return { success: false, error: "Token cannot be empty." };
  }

  const cookieStore = await cookies();
  cookieStore.set(PAT_COOKIE_NAME, trimmed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });

  return { success: true };
}

/**
 * Server action: Clears the custom GitHub Personal Access Token cookie.
 */
export async function clearPatTokenAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PAT_COOKIE_NAME);
}
