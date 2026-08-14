/**
 * Pattern engine: turns evidence records into structured, deterministic
 * pattern facts. Pure functions only — no LLM, no randomness, no guesses.
 *
 * Facts fall into five categories: timeline, language_evolution,
 * focus_areas, cadence, impact. Every fact carries the evidenceIds it is
 * derived from, and facts are only ever emitted when there is evidence to
 * back them. With zero (or insufficient) evidence the engine returns [].
 *
 * Language-evolution facts deliberately combine language byte counts (from
 * `language` records) with commit dates — repo metadata like
 * `CuratedProject.language` is never consulted.
 */

import type { CuratedProject } from "./curation";
import type { EvidenceRecord } from "./evidence";

export type PatternCategory = "timeline" | "language_evolution" | "focus_areas" | "cadence" | "impact";

export interface PatternFact {
  id: string;
  label: string;
  statement: string;
  evidenceIds: string[];
  category: PatternCategory;
}

const MAX_EVIDENCE_IDS_PER_FACT = 100;

/** Sources that count as user activity (language records are repo state). */
const ACTIVITY_SOURCES = new Set(["commit", "pull_request", "issue", "event"]);

const FOCUS_KEYWORDS: Record<string, string[]> = {
  auth: ["auth", "login", "oauth", "token", "session", "password", "sso", "jwt", "signin", "sign-in", "sign in", "credential"],
  api: ["api", "endpoint", "graphql", "rest", "route", "request", "response", "webhook"],
  ui: ["ui", "ux", "component", "design", "frontend", "interface", "button", "page", "css", "style", "styles", "dashboard", "screen", "visual"],
  data: ["data", "database", "sql", "migration", "schema", "model", "pipeline", "etl", "index", "dataset"],
  infra: ["infra", "deploy", "deployment", "docker", "kubernetes", "k8s", "ci", "cd", "cloud", "aws", "azure", "server", "config", "terraform", "workflow", "pipeline"],
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function yearOf(iso: string): number {
  const y = new Date(iso).getUTCFullYear();
  return Number.isFinite(y) ? y : Number.NaN;
}

function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

interface Quarter {
  label: string; // "Q1 2024"
  index: number; // year*4 + q — monotonic for ordering
}

function quarterOf(iso: string): Quarter | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return { label: `Q${q} ${y}`, index: y * 4 + q };
}

function matchKeyword(text: string, keyword: string): boolean {
  // Two-char keywords need word boundaries to avoid substring noise
  // ("ui" inside "build", "cd" inside "include").
  if (keyword.length <= 2) return new RegExp(`\\b${keyword}\\b`).test(text);
  return text.includes(keyword);
}

/** Analyzes evidence into deterministic pattern facts. */
export function analyzePatterns(
  evidence: EvidenceRecord[],
  repos: CuratedProject[] = []
): PatternFact[] {
  const facts: PatternFact[] = [];
  const counters = new Map<PatternCategory, number>();

  const addFact = (category: PatternCategory, label: string, statement: string, ids: string[]): void => {
    const unique = [...new Set(ids)].slice(0, MAX_EVIDENCE_IDS_PER_FACT);
    if (unique.length === 0) return; // never emit a fact without backing evidence
    const n = counters.get(category) ?? 0;
    counters.set(category, n + 1);
    facts.push({ id: `${category}-${n}`, label, statement, evidenceIds: unique, category });
  };

  const activity = evidence
    .filter((e) => ACTIVITY_SOURCES.has(e.source) && !Number.isNaN(yearOf(e.date)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const commits = activity.filter((e) => e.source === "commit");
  const pulls = activity.filter((e) => e.source === "pull_request");
  const languages = evidence.filter(
    (e) => e.source === "language" && e.meta.languages && typeof e.meta.languages === "object"
  );

  timelineFacts(activity, commits, addFact);
  languageEvolutionFacts(commits, languages, addFact);
  focusAreaFacts(activity, addFact);
  cadenceFacts(commits, pulls, addFact);
  impactFacts(evidence, commits, pulls, repos, addFact);

  return facts;
}

function timelineFacts(
  activity: EvidenceRecord[],
  commits: EvidenceRecord[],
  addFact: (category: PatternCategory, label: string, statement: string, ids: string[]) => void
): void {
  if (activity.length === 0) return;

  const first = activity[0];
  const firsts = activity.filter((e) => e.date === first.date).map((e) => e.id);
  addFact(
    "timeline",
    "First activity",
    `First activity: ${first.repoFullName}, ${prettyDate(first.date)}`,
    firsts
  );

  const byYear = new Map<number, EvidenceRecord[]>();
  for (const c of commits) {
    const y = yearOf(c.date);
    if (Number.isNaN(y)) continue;
    const arr = byYear.get(y) ?? [];
    arr.push(c);
    byYear.set(y, arr);
  }
  if (byYear.size === 0) return;
  const [bestYear, best] = [...byYear.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0] - b[0]
  )[0];
  addFact(
    "timeline",
    "Most active year",
    `Most active year: ${bestYear} (${best.length} commits)`,
    best.map((c) => c.id)
  );
}

function languageEvolutionFacts(
  commits: EvidenceRecord[],
  languages: EvidenceRecord[],
  addFact: (category: PatternCategory, label: string, statement: string, ids: string[]) => void
): void {
  if (commits.length === 0 || languages.length === 0) return;

  // Repo dominant language comes from byte counts only.
  const dominantByRepo = new Map<string, string>();
  for (const lang of languages) {
    const langs = lang.meta.languages as Record<string, number>;
    const entries = Object.entries(langs);
    if (entries.length === 0) continue;
    entries.sort((a, b) => b[1] - a[1]);
    dominantByRepo.set(lang.repoFullName, entries[0][0]);
  }

  // year -> repo -> commit count (commit dates drive the timeline).
  const yearRepoCounts = new Map<number, Map<string, number>>();
  for (const c of commits) {
    const y = yearOf(c.date);
    if (Number.isNaN(y)) continue;
    const lang = dominantByRepo.get(c.repoFullName);
    if (!lang) continue;
    let repoMap = yearRepoCounts.get(y);
    if (!repoMap) {
      repoMap = new Map();
      yearRepoCounts.set(y, repoMap);
    }
    repoMap.set(c.repoFullName, (repoMap.get(c.repoFullName) ?? 0) + 1);
  }

  const years = [...yearRepoCounts.keys()].sort((a, b) => a - b);
  if (years.length === 0) return;
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  const firstDominantYear = new Map<string, number>();
  const lastDominantYear = new Map<string, number>();
  const yearDominant = new Map<number, { lang: string; ids: string[] }>();

  for (const y of years) {
    const repoMap = yearRepoCounts.get(y)!;
    const langCounts = new Map<string, number>();
    for (const [repo, count] of repoMap) {
      const lang = dominantByRepo.get(repo)!;
      langCounts.set(lang, (langCounts.get(lang) ?? 0) + count);
    }
    const [lang] = [...langCounts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0];
    // Backing evidence: that year's commits in the dominant language plus
    // the language records of the repos that made it dominant.
    const ids = [
      ...commits
        .filter((c) => yearOf(c.date) === y && dominantByRepo.get(c.repoFullName) === lang)
        .map((c) => c.id),
      ...languages
        .filter(
          (l) =>
            dominantByRepo.get(l.repoFullName) === lang &&
            (yearRepoCounts.get(y)?.has(l.repoFullName) ?? false)
        )
        .map((l) => l.id),
    ];
    yearDominant.set(y, { lang, ids });
    if (!firstDominantYear.has(lang)) firstDominantYear.set(lang, y);
    lastDominantYear.set(lang, y);
  }

  for (const y of years) {
    const { lang, ids } = yearDominant.get(y)!;
    addFact("language_evolution", String(y), `${y} was dominated by ${lang}`, ids);
  }
  for (const [lang, y] of [...firstDominantYear.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (y > firstYear) {
      addFact(
        "language_evolution",
        lang,
        `${lang} first became a dominant language in ${y}`,
        yearDominant.get(y)!.ids
      );
    }
  }
  for (const [lang, y] of [...lastDominantYear.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (y < lastYear) {
      addFact(
        "language_evolution",
        lang,
        `${lang} stopped being a dominant language after ${y}`,
        yearDominant.get(y)!.ids
      );
    }
  }
}

function focusAreaFacts(
  activity: EvidenceRecord[],
  addFact: (category: PatternCategory, label: string, statement: string, ids: string[]) => void
): void {
  const texts = new Map<string, string>();
  for (const e of activity) {
    if (e.source === "commit") {
      const msg = typeof e.meta.message === "string" ? e.meta.message : e.title;
      texts.set(e.id, msg.toLowerCase());
    } else if (e.source === "pull_request" || e.source === "issue") {
      texts.set(e.id, `${e.title} ${e.detail ?? ""}`.toLowerCase());
    }
  }
  if (texts.size === 0) return;

  const matched = new Map<string, string[]>();
  for (const [category, keywords] of Object.entries(FOCUS_KEYWORDS)) {
    const ids: string[] = [];
    for (const [id, text] of texts) {
      if (keywords.some((kw) => matchKeyword(text, kw))) ids.push(id);
    }
    if (ids.length > 0) matched.set(category, ids);
  }

  const ranked = [...matched.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
  );
  for (const [category, ids] of ranked) {
    const label = category.toUpperCase();
    addFact(
      "focus_areas",
      `Focus: ${label}`,
      `${label} work shows up in ${ids.length} contribution${ids.length === 1 ? "" : "s"}`,
      ids
    );
  }
}

function cadenceFacts(
  commits: EvidenceRecord[],
  pulls: EvidenceRecord[],
  addFact: (category: PatternCategory, label: string, statement: string, ids: string[]) => void
): void {
  if (commits.length + pulls.length === 0) return;

  const quarterMap = new Map<string, { quarter: Quarter; commits: string[]; pulls: string[] }>();
  for (const c of commits) {
    const q = quarterOf(c.date);
    if (!q) continue;
    const entry = quarterMap.get(q.label) ?? { quarter: q, commits: [], pulls: [] };
    entry.commits.push(c.id);
    quarterMap.set(q.label, entry);
  }
  for (const p of pulls) {
    const q = quarterOf(p.date);
    if (!q) continue;
    const entry = quarterMap.get(q.label) ?? { quarter: q, commits: [], pulls: [] };
    entry.pulls.push(p.id);
    quarterMap.set(q.label, entry);
  }

  // Chronological order by quarter index (year*4+q), not label text:
  // "Q3 2024" must precede "Q1 2025" despite the lexicographic reversal.
  const quarters = [...quarterMap.entries()].sort((a, b) => a[1].quarter.index - b[1].quarter.index);
  for (const [label, entry] of quarters) {
    const n = entry.commits.length;
    const m = entry.pulls.length;
    addFact(
      "cadence",
      label,
      `${n} commit${n === 1 ? "" : "s"}, ${m} pull request${m === 1 ? "" : "s"}`,
      [...entry.commits, ...entry.pulls]
    );
  }

  const totals = quarters.map(([label, entry]) => ({
    label,
    total: entry.commits.length + entry.pulls.length,
  }));
  const busiest = totals.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))[0];
  const busiestEntry = quarterMap.get(busiest.label)!;
  addFact(
    "cadence",
    "Busiest quarter",
    `Busiest quarter: ${busiest.label} (${busiest.total} commits and PRs)`,
    [...busiestEntry.commits, ...busiestEntry.pulls]
  );

  // Longest streak: consecutive quarters (by calendar order) with ≥1 commit.
  const commitQuarterLabels = [...quarterMap.entries()]
    .filter(([, entry]) => entry.commits.length > 0)
    .map(([label]) => label)
    .sort((a, b) => quarterMap.get(a)!.quarter.index - quarterMap.get(b)!.quarter.index);
  let bestRun: string[] = [];
  let run: string[] = [];
  for (const label of commitQuarterLabels) {
    if (run.length === 0) {
      run = [label];
    } else {
      const prev = quarterMap.get(run[run.length - 1])!.quarter;
      const cur = quarterMap.get(label)!.quarter;
      if (cur.index === prev.index + 1) run.push(label);
      else run = [label];
    }
    if (run.length > bestRun.length) bestRun = run;
  }
  if (bestRun.length >= 2) {
    const ids = bestRun.flatMap((label) => quarterMap.get(label)!.commits);
    addFact(
      "cadence",
      "Longest streak",
      `Longest active streak: ${bestRun.length} consecutive quarters (${bestRun[0]}–${bestRun[bestRun.length - 1]})`,
      ids
    );
  }
}

function impactFacts(
  evidence: EvidenceRecord[],
  commits: EvidenceRecord[],
  pulls: EvidenceRecord[],
  repos: CuratedProject[],
  addFact: (category: PatternCategory, label: string, statement: string, ids: string[]) => void
): void {
  const byRepo = new Map<string, string[]>();
  for (const c of commits) {
    const arr = byRepo.get(c.repoFullName) ?? [];
    arr.push(c.id);
    byRepo.set(c.repoFullName, arr);
  }
  if (byRepo.size > 0) {
    const [repo, ids] = [...byRepo.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
    )[0];
    addFact("impact", "Most commits", `Most commits in ${repo} (${ids.length})`, ids);
  }

  const mergedByRepo = new Map<string, string[]>();
  for (const p of pulls) {
    if (p.meta.merged === true) {
      const arr = mergedByRepo.get(p.repoFullName) ?? [];
      arr.push(p.id);
      mergedByRepo.set(p.repoFullName, arr);
    }
  }
  if (mergedByRepo.size > 0) {
    const [repo, ids] = [...mergedByRepo.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
    )[0];
    addFact("impact", "Most merged PRs", `Most merged PRs in ${repo} (${ids.length})`, ids);
  }

  // Star counts live on curated projects (evidence has no star data) — the
  // fact is only emitted when the top-starred repo has backing evidence.
  const byStars = [...repos].sort(
    (a, b) => b.stargazersCount - a.stargazersCount || a.fullName.localeCompare(b.fullName)
  );
  const top = byStars[0];
  if (top && top.stargazersCount > 0) {
    const backing = evidence.filter((e) => e.repoFullName === top.fullName).map((e) => e.id);
    if (backing.length > 0) {
      addFact(
        "impact",
        "Most stars",
        `Most-starred repo ${top.fullName} (${top.stargazersCount} stars)`,
        backing
      );
    }
  }
}