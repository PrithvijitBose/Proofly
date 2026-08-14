/**
 * Client-side persistent storage for user-customized and approved journeys.
 *
 * Distinguishes between in-flight AI drafts and the user-approved story that
 * represents their official professional identity on Proofly.
 */

import type { GuardedNarrative } from "./guardrails";

export interface ApprovedJourney {
  narrative: GuardedNarrative;
  isApproved: boolean;
  savedAt: string;
  tone?: string;
  customPrompt?: string;
}

export function getApprovedJourneyStorageKey(login: string): string {
  const safe = login.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-") || "default";
  return `proofly_approved_journey_${safe}`;
}

export function loadApprovedJourney(login: string): ApprovedJourney | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getApprovedJourneyStorageKey(login));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApprovedJourney>;
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.narrative &&
      Array.isArray(parsed.narrative.chapters)
    ) {
      return {
        narrative: parsed.narrative,
        isApproved: Boolean(parsed.isApproved),
        savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
        tone: typeof parsed.tone === "string" ? parsed.tone : undefined,
        customPrompt: typeof parsed.customPrompt === "string" ? parsed.customPrompt : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveApprovedJourney(login: string, journey: ApprovedJourney): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getApprovedJourneyStorageKey(login), JSON.stringify(journey));
  } catch {
    // Gracefully handle storage quota or private browsing exceptions
  }
}

export function clearApprovedJourney(login: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getApprovedJourneyStorageKey(login));
  } catch {
    // Gracefully ignore
  }
}
