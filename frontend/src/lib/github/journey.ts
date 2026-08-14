/**
 * Journey story builder.
 *
 * Turns a user's GitHub history (profile + owned repos) into a structured,
 * human-readable "story of their journey" — chapters drawn from real
 * signals: when they started, what they first built, how their languages
 * evolved, which repo broke out, and what they're working on now.
 *
 * Deterministic (no LLM): every sentence is composed from actual GitHub
 * data, so it never hallucinates. The same chapter shape can later be
 * handed to an LLM for prose polish without changing the UI contract.
 */

import type { GitHubRepo, GitHubUser } from "./client";

export interface ChapterStat {
  label: string;
  value: string;
}

export interface Chapter {
  index: number;
  title: string;
  kicker: string;
  paragraphs: string[];
  stats: ChapterStat[];
}

export interface TimelineItem {
  date: string;
  title: string;
  detail: string;
}

export interface JourneyStory {
  userName: string;
  userLogin: string;
  userAvatar: string;
  userBio: string | null;
  chapters: Chapter[];
  timeline: TimelineItem[];
  stats: ChapterStat[];
  hadHistory: boolean;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function prettyDate(iso: string): string {
  const d = parseDate(iso);
  return d ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "A while ago";
}

function prettyNum(n: number): string {
  return n.toLocaleString("en-US");
}

function plural(n: number, word: string): string {
  return `${prettyNum(n)} ${word}${n === 1 ? "" : "s"}`;
}

function cleanName(repo: GitHubRepo): string {
  const base = repo.name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return base || repo.name;
}

function describeRepo(repo: GitHubRepo): string {
  const bits: string[] = [cleanName(repo)];
  if (repo.language) bits.push(`built in ${repo.language}`);
  if (repo.description) bits.push(`— ${repo.description.replace(/\.$/, "")}`);
  return bits.join(" ");
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Build the journey story for a user from their owned, non-fork repos. */
export function buildJourneyStory(user: GitHubUser, allRepos: GitHubRepo[]): JourneyStory {
  const repos = allRepos
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const oldest = repos[0] ?? null;
  const newest = repos[repos.length - 1] ?? null;
  const topStarred = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0] ?? null;

  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
  const languages = repos.reduce<Record<string, number>>((acc, r) => {
    if (r.language) acc[r.language] = (acc[r.language] ?? 0) + 1;
    return acc;
  }, {});
  const topLanguages = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Guarded against invalid dates: curated projects without a stored
  // createdAt surface as 0 years, not "NaN years".
  const rawYears = oldest ? Math.ceil((Date.now() - new Date(oldest.created_at).getTime()) / (365.25 * DAY_MS)) : 0;
  const yearsActive = Number.isFinite(rawYears) ? Math.max(1, rawYears) : 0;

  const recentlyPushed = repos.filter((r) => new Date(r.pushed_at).getTime() > Date.now() - 90 * DAY_MS).length;

  const chapters: Chapter[] = [];
  const timeline: TimelineItem[] = [];
  const stats: ChapterStat[] = [
    { label: "Repositories", value: prettyNum(repos.length) },
    { label: "Total stars", value: prettyNum(totalStars) },
    { label: "Languages", value: prettyNum(Object.keys(languages).length) },
  ];

  const base: JourneyStory = {
    userName: user.name ?? user.login,
    userLogin: user.login,
    userAvatar: user.avatar_url,
    userBio: user.bio,
    chapters,
    timeline,
    stats,
    hadHistory: repos.length > 0,
  };

  if (repos.length === 0) {
    chapters.push({
      index: 1,
      title: "A Story Waiting to Begin",
      kicker: "Every journey has a first commit",
      paragraphs: [
        "No public repositories yet — but that only means the story is unwritten. The next repository you create will be Chapter 1.",
      ],
      stats: [],
    });
    return base;
  }

  // Chapter 1 — the beginning
  {
    const firstYearCount = repos.filter(
      (r) => new Date(r.created_at).getUTCFullYear() === new Date(oldest.created_at).getUTCFullYear()
    ).length;

    const paragraphs: string[] = [
      `Every journey starts somewhere, and ${possessive(user.login)} public history starts with ${describeRepo(oldest)} — created in ${prettyDate(oldest.created_at)}.`,
    ];
    if (firstYearCount > 1) {
      paragraphs.push(
        `That first year carried real momentum: ${plural(firstYearCount, "repository")} appeared before the year was out.`
      );
    } else if (oldest.description) {
      paragraphs.push(
        `From the very first repository, the direction was clear: ${oldest.description.trim().replace(/\.$/, "")}.`
      );
    }
    chapters.push({
      index: 1,
      title: "The First Line",
      kicker: "where it all began",
      paragraphs,
      stats: [
        { label: "Started", value: prettyDate(oldest.created_at) },
        { label: "First language", value: oldest.language ?? "—" },
      ],
    });
    timeline.push({
      date: prettyDate(oldest.created_at),
      title: "The first repository",
      detail: describeRepo(oldest),
    });
  }

  // Chapter 2 — the craft
  if (topLanguages.length > 0) {
    const langLabel = topLanguages
      .map(([lang, count]) => `${lang}${count > 1 ? ` ×${count}` : ""}`)
      .join(", ");
    chapters.push({
      index: 2,
      title: "The Craft",
      kicker: "a toolkit taking shape",
      paragraphs: [
        `Across ${plural(repos.length, "repository")}, a toolkit emerged. The most-used language is ${topLanguages[0][0]}, followed by ${topLanguages
          .slice(1)
          .map(([lang]) => lang)
          .join(" and ") || "nothing else yet"}.`,
        topLanguages.length > 1
          ? `That mix — ${langLabel} — tells the story of someone who picks the right tool per problem instead of forcing one language on everything.`
          : `Consistency has its own power: ${topLanguages[0][0]} is doing the heavy lifting across the whole journey.`,
      ],
      stats: topLanguages.map(([lang, count]) => ({ label: lang, value: `${count} repo${count === 1 ? "" : "s"}` })),
    });
  }

  // Chapter 3 — the breakout
  if (topStarred && topStarred.stargazers_count > 0) {
    chapters.push({
      index: 3,
      title: "The Breakout",
      kicker: "the repository that got noticed",
      paragraphs: [
        `If one repository speaks loudest, it's ${describeRepo(topStarred)} — the project carrying ${plural(
          topStarred.stargazers_count,
          "star"
        )}${topStarred.forks_count > 0 ? ` and ${plural(topStarred.forks_count, "fork")}` : ""}.`,
        topStarred.description
          ? `Its pitch: ${topStarred.description.trim().replace(/\.$/, "")}. Projects that solve a real problem tend to attract a community — and that changes what the next chapter can be.`
          : "No description attached, but the stars speak for themselves.",
      ],
      stats: [
        { label: "Stars", value: prettyNum(topStarred.stargazers_count) },
        { label: "Forks", value: prettyNum(topStarred.forks_count) },
        { label: "Primary language", value: topStarred.language ?? "—" },
      ],
    });
    timeline.push({
      date: prettyDate(topStarred.created_at),
      title: "The breakout",
      detail: describeRepo(topStarred),
    });
  }

  // Chapter 4 — momentum
  {
    const paragraphs: string[] = [
      `The journey stays in motion: ${plural(recentlyPushed, "repository")} saw activity in the last 90 days${
        newest ? `, with ${cleanName(newest)} the most recently touched` : ""
      }.`,
      `To date: ${plural(repos.length, "repository")}, ${plural(totalStars, "star")}, and ${plural(
        totalForks,
        "fork"
      )} across ${plural(Object.keys(languages).length, "language")}${yearsActive > 0 ? ` — built over ${plural(yearsActive, "year")}` : ""}.`,
    ];
    chapters.push({
      index: 4,
      title: "Momentum",
      kicker: "the story continues",
      paragraphs,
      stats: [
        { label: "Active (90 days)", value: prettyNum(recentlyPushed) },
        { label: "Years active", value: String(yearsActive) },
        { label: "Followers", value: prettyNum(user.followers) },
      ],
    });
    timeline.push({
      date: newest ? prettyDate(newest.pushed_at) : "Recently",
      title: "Latest activity",
      detail: newest ? describeRepo(newest) : "Waiting for the next commit",
    });
  }

  return base;
}

function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}