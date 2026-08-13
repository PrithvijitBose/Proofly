import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGitHubAccessToken } from "@/lib/auth/github-token";
import { getAuthenticatedUser, GitHubApiError } from "@/lib/github/client";
import { gatherEvidence, MAX_CURATED_REPOS } from "@/lib/github/gather";
import { analyzePatterns } from "@/lib/github/patterns";
import { buildContextPack } from "@/lib/github/context-pack";
import { AiJourneyError, generateAiNarrative, validateClaimsAgainstEvidence } from "@/lib/github/ai-journey";
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
 *       back to the deterministic story, never raw LLM text)
 *   503 narrative: null + error "llm_not_configured" (no MISTRAL_API_KEY)
 *   401 unauthenticated
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const login = session?.user?.login;
  const token = await getGitHubAccessToken();
  if (!login || !token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { repos?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Expected a JSON body." }, { status: 400 });
  }

  const fullNames = Array.isArray(body.repos)
    ? body.repos
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim())
        .filter((r) => REPO_NAME_PATTERN.test(r))
        .slice(0, MAX_CURATED_REPOS)
    : [];

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
      const narrative = await generateAiNarrative(pack, apiKey);

      // First guardrail line: claims must cite real evidence before we respond.
      const check = validateClaimsAgainstEvidence(narrative, gathered.evidence);
      if (!check.valid) {
        return NextResponse.json(
          {
            error: "invalid_narrative",
            message: "The AI narrative failed evidence validation.",
            problems: check.problems.slice(0, 20),
            narrative: null,
            user,
            repos,
            warnings: gathered.warnings,
          },
          { status: 502 }
        );
      }

      // Guardrail pass: deterministic verification of every claim against
      // the FULL evidence store (unknown ids / fabrication → dropped,
      // numeric/entity mismatches → flagged). The response carries the
      // verified flags the UI renders.
      const guarded = verifyNarrative(narrative, gathered.evidence, patterns);

      return NextResponse.json({
        user,
        repos,
        narrative: guarded,
        evidence: gathered.evidence,
        patterns,
        warnings: gathered.warnings,
      });
    } catch (err) {
      const status = err instanceof AiJourneyError ? err.status : 500;
      const message = err instanceof AiJourneyError ? err.message : "Unexpected error while generating the narrative.";
      return NextResponse.json(
        { error: "ai_failure", message, narrative: null, user, repos, warnings: gathered.warnings },
        { status }
      );
    }
  } catch (err) {
    const status = err instanceof GitHubApiError && (err.status === 401 || err.status === 403) ? err.status : 500;
    const message = err instanceof GitHubApiError ? err.message : "Something went wrong while preparing your journey.";
    return NextResponse.json({ error: "preparation_failed", message, narrative: null }, { status });
  }
}