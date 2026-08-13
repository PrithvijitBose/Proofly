import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGitHubAccessToken } from "@/lib/auth/github-token";
import { getAuthenticatedUser } from "@/lib/github/client";
import { buildJourneyBundle } from "@/lib/github/export";
import type { CuratedProject } from "@/lib/github/curation";
import type { PatternFact } from "@/lib/github/patterns";
import type { GuardedNarrative } from "@/lib/github/guardrails";
import type { EvidenceRecord } from "@/lib/github/evidence";

export const dynamic = "force-dynamic";

/**
 * POST /api/journey/export
 *
 * Body: { repos, patterns, narrative, evidence, warnings } — the guarded
 * journey state the client is currently rendering. Deterministic: no LLM
 * call, works without MISTRAL_API_KEY. The server attaches the
 * authenticated user and verifies the bundle is self-contained (every
 * claim citation must resolve inside the exported evidence) before
 * responding with a downloadable attachment.
 *
 * Responses:
 *   200 JSON attachment, Content-Disposition: attachment;
 *       filename="proofly-journey-{login}.json"
 *   400 invalid_evidence — narrative cites records missing from the bundle
 *   401 unauthenticated
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const login = session?.user?.login;
  const token = await getGitHubAccessToken();
  if (!login || !token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    repos?: unknown;
    patterns?: unknown;
    narrative?: unknown;
    evidence?: unknown;
    warnings?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Expected a JSON body." }, { status: 400 });
  }

  if (
    !Array.isArray(body.repos) ||
    !Array.isArray(body.patterns) ||
    !Array.isArray(body.evidence) ||
    !Array.isArray(body.warnings) ||
    !body.narrative ||
    typeof body.narrative !== "object"
  ) {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected repos, patterns, narrative, evidence and warnings." },
      { status: 400 }
    );
  }

  let user;
  try {
    user = await getAuthenticatedUser(token);
  } catch {
    return NextResponse.json({ error: "unavailable", message: "Could not confirm your GitHub identity." }, { status: 502 });
  }

  let bundle;
  try {
    bundle = buildJourneyBundle({
      user,
      repos: body.repos as CuratedProject[],
      patterns: body.patterns as PatternFact[],
      narrative: body.narrative as GuardedNarrative,
      evidence: body.evidence as EvidenceRecord[],
      warnings: body.warnings as string[],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_evidence", message: err instanceof Error ? err.message : "Invalid bundle." },
      { status: 400 }
    );
  }

  const filename = `proofly-journey-${login}.json`;
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}