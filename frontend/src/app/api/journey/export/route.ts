import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSessionOrPat } from "@/lib/auth/github-token";
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
 * Builds a machine-readable JSON export bundle of the user's journey.
 * Validates integrity server-side (every curated repo must match and every
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
  const authData = await getAuthenticatedSessionOrPat();
  if (!authData) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { login, token } = authData;

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
    typeof body.narrative !== "object" ||
    Array.isArray(body.narrative) ||
    !Array.isArray((body.narrative as { chapters?: unknown }).chapters)
  ) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message:
          "Expected repos, patterns, evidence and warnings arrays, and a narrative object with a chapters array.",
      },
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

  const safeLogin = login.replace(/[^A-Za-z0-9._-]/g, "-") || "user";
  const filename = `proofly-journey-${safeLogin}.json`;
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}