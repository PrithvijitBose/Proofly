import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSessionOrPat } from "@/lib/auth/github-token";
import { getAuthenticatedUser, GitHubApiError } from "@/lib/github/client";
import { gatherEvidence, MAX_CURATED_REPOS } from "@/lib/github/gather";
import { analyzePatterns } from "@/lib/github/patterns";
import { buildContextPack } from "@/lib/github/context-pack";
import { AiJourneyError, generateAiNarrative } from "@/lib/github/ai-journey";
import { verifyNarrative } from "@/lib/github/guardrails";
import type { CuratedProject } from "@/lib/github/curation";

export const dynamic = "force-dynamic";

const REPO_NAME_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/**
 * POST /api/journey/generate  { repos: string[] }
 *
 * Auth-gated. Gathers evidence for the curated repos the client names
 * (curation lives in localStorage), derives patterns, builds the context
 * pack, and asks Mistral for a cited narrative. Server-only: the LLM key
 * and GitHub token never leave the server.
 *
 * Responses:
 *   200 { user, repos, narrative: GuardedNarrative, evidence, patterns, warnings }
 *       — every claim verified/filtered by the guardrail pass
 *   502 narrative: null (AI failure / schema-invalid output — caller falls
 *       back to the deterministic story, never raw LLM text; the upstream
 *       provider's status is surfaced as `providerStatus`, never used as the
 *       HTTP status)
 *   503 narrative: null + error "llm_not_configured" (no MISTRAL_API_KEY)
 *   401 unauthenticated
 */
export async function POST(request: NextRequest) {
  const authData = await getAuthenticatedSessionOrPat();
  if (!authData) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { login, token } = authData;

  let body: { repos?: unknown; tone?: unknown; customPrompt?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Expected a JSON body." }, { status: 400 });
  }

  const tone = typeof body.tone === "string" && body.tone.trim() ? body.tone.trim() : undefined;
  const customPrompt =
    typeof body.customPrompt === "string" && body.customPrompt.trim() ? body.customPrompt.trim() : undefined;

  const fullNames = Array.isArray(body.repos)
    ? body.repos
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim())
        .filter((r) => REPO_NAME_PATTERN.test(r))
        .slice(0, MAX_CURATED_REPOS)
    : [];

  if (fullNames.length === 0) {
    return NextResponse.json(
      { error: "invalid_repos", message: "Provide at least one repository as owner/name.", narrative: null },
      { status: 400 }
    );
  }

  const repos: CuratedProject[] = fullNames.map((fullName) => ({
    repoId: 0,
    name: fullName.split("/")[1],
    fullName,
    htmlUrl: `https://github.com/${fullName}`,
    description: null,
    language: null,
    stargazersCount: 0,
    forksCount: 0,
    pushedAt: "",
    customNote: "",
    priority: 0,
  }));

  let user;
  try {
    const fetchedAt = new Date().toISOString();
    const [ghUser, gathered] = await Promise.all([
      getAuthenticatedUser(token),
      gatherEvidence(token, login, repos, fetchedAt),
    ]);
    user = ghUser;

    const patterns = analyzePatterns(gathered.evidence, repos);
    const pack = buildContextPack(gathered.evidence, patterns);

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "llm_not_configured",
          message: "AI narrative generation is not configured yet (MISTRAL_API_KEY missing).",
          narrative: null,
          user,
          repos,
          warnings: gathered.warnings,
        },
        { status: 503 }
      );
    }

    try {
      const narrative = await generateAiNarrative(pack, apiKey, { tone, customPrompt });

      // Guardrail pass: deterministic verification of every claim against
      // the FULL evidence store (unknown ids / fabrication → dropped,
      // numeric/entity mismatches → flagged, dropped chapters replaced by facts).
      const guarded = verifyNarrative(narrative, gathered.evidence, patterns);

      return NextResponse.json({
        user,
        repos,
        narrative: guarded,
        evidence: gathered.evidence,
        patterns,
        warnings: gathered.warnings,
        tone,
        customPrompt,
      });
    } catch (err) {
      // AI failures always answer 502 — upstream provider statuses (429/503/500)
      // never leak through as the HTTP status; they surface as payload data.
      const status = err instanceof AiJourneyError ? 502 : 500;
      const message = err instanceof AiJourneyError ? err.message : "Unexpected error while generating the narrative.";
      return NextResponse.json(
        {
          error: "ai_failure",
          message,
          providerStatus: err instanceof AiJourneyError ? (err.providerStatus ?? null) : null,
          narrative: null,
          user,
          repos,
          warnings: gathered.warnings,
        },
        { status }
      );
    }
  } catch (err) {
    const status = err instanceof GitHubApiError && (err.status === 401 || err.status === 403) ? err.status : 500;
    const message = err instanceof GitHubApiError ? err.message : "Something went wrong while preparing your journey.";
    return NextResponse.json({ error: "preparation_failed", message, narrative: null }, { status });
  }
}