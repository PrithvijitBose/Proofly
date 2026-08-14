import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSessionOrPat } from "@/lib/auth/github-token";
import { getAuthenticatedUser, GitHubApiError } from "@/lib/github/client";
import type { CuratedProject } from "@/lib/github/curation";
import { gatherEvidence, MAX_CURATED_REPOS } from "@/lib/github/gather";

export const dynamic = "force-dynamic";

const REPO_NAME_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/**
 * GET /api/journey/evidence?repos=owner/name,owner/name2
 *
 * Server-only: reads the GitHub access token (OAuth or PAT) and never
 * exposes it. Curated repositories live in the browser's localStorage, so
 * the client passes the curated full names as a query param; the server
 * re-fetches all evidence with its own token (the client sends no data
 * beyond repo identifiers).
 *
 * Response: { user, repos, evidence: EvidenceRecord[], warnings: string[] }
 */
export async function GET(request: NextRequest) {
  const authData = await getAuthenticatedSessionOrPat();
  if (authData.status === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (authData.status === "upstream_error") {
    return NextResponse.json(
      { error: "unavailable", message: authData.message },
      { status: 502 }
    );
  }
  const { login, token } = authData;

  const raw = request.nextUrl.searchParams.get("repos") ?? "";
  const fullNames = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((n) => REPO_NAME_PATTERN.test(n))
    .slice(0, MAX_CURATED_REPOS);

  const repos: CuratedProject[] = fullNames.map((fullName) => {
    const name = fullName.split("/")[1];
    return {
      repoId: 0, // server-side view — fullName is the key, ids stay client-side
      name,
      fullName,
      htmlUrl: `https://github.com/${fullName}`,
      description: null,
      language: null,
      stargazersCount: 0,
      forksCount: 0,
      pushedAt: "",
      customNote: "",
      priority: 0,
    };
  });

  try {
    const [user, gathered] = await Promise.all([
      getAuthenticatedUser(token),
      gatherEvidence(token, login, repos, new Date().toISOString()),
    ]);
    return NextResponse.json({
      user,
      repos,
      evidence: gathered.evidence,
      warnings: gathered.warnings,
    });
  } catch (err) {
    const status = err instanceof GitHubApiError && (err.status === 401 || err.status === 403) ? err.status : 500;
    const message =
      err instanceof GitHubApiError
        ? err.message
        : "Something went wrong while gathering evidence.";
    return NextResponse.json({ error: message }, { status });
  }
}