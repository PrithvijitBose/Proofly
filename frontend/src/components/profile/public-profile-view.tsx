"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PublicProfile } from "@/lib/github/profile-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareProfileModal } from "./share-profile-modal";
import { EvidencePanel } from "@/components/journey/evidence-panel";
import {
  GitBranch,
  Star,
  GitFork,
  ExternalLink,
  MapPin,
  Building,
  Globe,
  Github,
  QrCode,
  Sparkles,
  CheckCircle2,
  BookmarkCheck,
  ShieldCheck,
  Code2,
  Calendar,
  Layers,
  ArrowUpRight,
  Terminal,
} from "lucide-react";

interface PublicProfileViewProps {
  profile: PublicProfile;
  isOwner?: boolean;
}

export function PublicProfileView({ profile, isOwner = false }: PublicProfileViewProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);

  const displayName = profile.name || profile.username;
  const hasCuratedProjects = profile.curatedProjects && profile.curatedProjects.length > 0;
  const narrative = profile.narrative;

  // Build evidence index for direct citation resolution
  const evidenceById = useMemo(() => {
    const map = new Map<string, (typeof profile.evidence)[0]>();
    if (Array.isArray(profile.evidence)) {
      for (const record of profile.evidence) {
        if (record?.id) {
          map.set(record.id, record);
        }
      }
    }
    return map;
  }, [profile.evidence]);

  // Language aggregation across curated repos
  const languages = Array.from(
    new Set(
      profile.curatedProjects
        .map((p) => p.language)
        .filter((l): l is string => Boolean(l))
    )
  );

  return (
    <div className="min-h-screen bg-grid-pattern pb-24 text-slate-100">
      {/* Share Modal Dialog */}
      <ShareProfileModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        username={profile.username}
        name={profile.name}
        customUrl={profile.canonicalUrl}
      />

      {/* Owner Banner (if viewed by the account owner) */}
      {isOwner && (
        <div className="w-full border-b border-proof-cyan/30 bg-proof-cyan/10 py-2.5 px-4">
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-3 text-xs font-mono text-proof-cyan">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-proof-cyan animate-pulse" />
              <span>You are previewing your live public profile. Anyone with this link or QR code can view this.</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/journey" className="hover:underline font-bold">
                Edit in Studio
              </Link>
              <button
                onClick={() => setShareModalOpen(true)}
                className="font-bold underline text-white hover:text-proof-cyan"
              >
                Share QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 space-y-12">
        {/* Profile Hero Header */}
        <section className="relative overflow-hidden rounded-3xl border border-proof-border bg-proof-dark/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-proof-amber/15 blur-3xl" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar with Glow Ring */}
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-proof-amber/50 shadow-glow-amber bg-proof-obsidian">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Title & Info */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                    {displayName}
                  </h1>
                  <Badge variant="amber" className="text-[10px] font-mono gap-1">
                    <ShieldCheck className="h-3 w-3 text-proof-amber" />
                    VERIFIED_IDENTITY
                  </Badge>
                  {profile.isApproved && (
                    <Badge variant="emerald" className="text-[10px] font-mono gap-1">
                      <CheckCircle2 className="h-3 w-3 text-proof-emerald" />
                      APPROVED_STORY
                    </Badge>
                  )}
                </div>

                <p className="text-sm font-mono text-proof-amber">
                  @{profile.username}
                </p>

                {profile.bio && (
                  <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                    {profile.bio}
                  </p>
                )}

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-proof-ash font-mono">
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-proof-amber" />
                      {profile.location}
                    </span>
                  )}
                  {profile.company && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-proof-cyan" />
                      {profile.company}
                    </span>
                  )}
                  {profile.blog && (
                    <a
                      href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-proof-cyan hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {profile.blog.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  <a
                    href={`https://github.com/${profile.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-300 hover:text-white hover:underline"
                  >
                    <Github className="h-3.5 w-3.5" />
                    github/{profile.username}
                  </a>
                </div>
              </div>
            </div>

            {/* Share / QR Action */}
            <div className="flex sm:flex-col items-center gap-3 w-full sm:w-auto shrink-0">
              <Button
                onClick={() => setShareModalOpen(true)}
                className="w-full sm:w-auto bg-proof-amber text-black hover:bg-proof-amber/90 font-bold text-xs gap-2 shadow-glow-amber px-5 py-2.5 h-auto rounded-xl"
              >
                <QrCode className="h-4 w-4" />
                Share & QR Code
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-proof-border/80 pt-6">
            <div className="rounded-xl border border-proof-border bg-proof-obsidian/70 p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-proof-amber font-display">
                {profile.curatedProjects.length}
              </div>
              <div className="mt-0.5 text-[10px] uppercase font-mono tracking-wider text-proof-ash">
                Cornerstone Repos
              </div>
            </div>

            <div className="rounded-xl border border-proof-border bg-proof-obsidian/70 p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-proof-cyan font-display">
                {narrative?.verifiedClaimCount || narrative?.chapters?.length || 0}
              </div>
              <div className="mt-0.5 text-[10px] uppercase font-mono tracking-wider text-proof-ash">
                Verified Milestones
              </div>
            </div>

            <div className="rounded-xl border border-proof-border bg-proof-obsidian/70 p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-proof-emerald font-display">
                {profile.curatedProjects.reduce((acc, p) => acc + (p.stargazersCount || 0), 0)}
              </div>
              <div className="mt-0.5 text-[10px] uppercase font-mono tracking-wider text-proof-ash">
                Project Stars
              </div>
            </div>

            <div className="rounded-xl border border-proof-border bg-proof-obsidian/70 p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-white font-display">
                {profile.publicRepos}
              </div>
              <div className="mt-0.5 text-[10px] uppercase font-mono tracking-wider text-proof-ash">
                Public Repos
              </div>
            </div>
          </div>
        </section>

        {/* Section: Professional Story Narrative */}
        {narrative && narrative.chapters && narrative.chapters.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-proof-border pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-proof-amber" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                  Professional Journey & Accomplishments
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-proof-border text-proof-ash">
                Tone: {profile.tone}
              </Badge>
            </div>

            <div className="space-y-6">
              {narrative.chapters.map((chapter) => (
                <article
                  key={chapter.index}
                  className="relative rounded-2xl border border-proof-border bg-proof-dark/80 p-6 sm:p-8 shadow-sm backdrop-blur-sm transition-all hover:border-proof-amber/40"
                >
                  <div className="absolute -left-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full bg-proof-amber text-xs font-bold text-black sm:flex font-mono">
                    {chapter.index}
                  </div>
                  <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-proof-amber">
                    {chapter.kicker}
                  </p>
                  <h3 className="mt-1 text-lg sm:text-xl font-bold text-white font-display">
                    {chapter.title}
                  </h3>

                  <div className="mt-4 space-y-3">
                    {chapter.claims.map((claim, cIdx) => (
                      <div key={cIdx} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                        <CheckCircle2 className="h-4 w-4 text-proof-emerald shrink-0 mt-0.5" />
                        <div>
                          <span>{claim.text}</span>
                          {claim.evidenceIds && claim.evidenceIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {claim.evidenceIds.map((eid) => {
                                const record = evidenceById.get(eid);
                                if (record) {
                                  return (
                                    <a
                                      key={eid}
                                      href={record.url || "#"}
                                      target={record.url ? "_blank" : undefined}
                                      rel="noopener noreferrer"
                                      title={`${record.source.toUpperCase()}: ${record.title || eid} (${record.repoFullName})`}
                                      className="group/ev inline-flex items-center gap-1.5 rounded-md border border-proof-border/80 bg-proof-obsidian px-2 py-0.5 font-mono text-[10px] text-proof-cyan hover:border-proof-cyan/50 hover:bg-proof-dark transition-colors"
                                    >
                                      <span className="font-semibold text-proof-amber uppercase tracking-wider text-[9px]">
                                        {record.source}
                                      </span>
                                      <span className="text-slate-300 group-hover/ev:text-white truncate max-w-[150px]">
                                        {record.title || record.repoFullName}
                                      </span>
                                      <span className="text-proof-ash">{eid}</span>
                                      {record.url && (
                                        <ExternalLink className="h-2.5 w-2.5 opacity-70 group-hover/ev:opacity-100 shrink-0 text-proof-cyan" />
                                      )}
                                    </a>
                                  );
                                }

                                return (
                                  <span
                                    key={eid}
                                    className="inline-flex items-center rounded-md border border-proof-border/80 bg-proof-obsidian px-2 py-0.5 font-mono text-[10px] text-proof-cyan"
                                  >
                                    {eid}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Section: Curated Projects Showcase */}
        {hasCuratedProjects && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-proof-border pb-4">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-proof-cyan" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                  Cornerstone Engineering Projects
                </h2>
              </div>
              <span className="text-xs text-proof-ash font-mono">
                {profile.curatedProjects.length} Highlighted
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.curatedProjects.map((project) => (
                <div
                  key={project.repoId}
                  className="flex flex-col justify-between rounded-2xl border border-proof-border bg-proof-dark/80 p-5 shadow-sm hover:border-proof-cyan/50 transition-all group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-proof-cyan/10 font-mono text-[10px] font-bold text-proof-cyan border border-proof-cyan/30">
                          #{project.priority}
                        </span>
                        <h3 className="font-bold text-white text-base group-hover:text-proof-cyan transition-colors">
                          {project.name}
                        </h3>
                      </div>
                      <a
                        href={project.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-proof-ash hover:text-white transition-colors"
                        title="View on GitHub"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </div>

                    {project.description && (
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}

                    {project.customNote && (
                      <div className="rounded-xl border border-proof-amber/30 bg-proof-amber/5 p-2.5 text-xs text-amber-200/90 font-mono">
                        <strong className="text-proof-amber font-bold">Highlight: </strong>
                        {project.customNote}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-proof-border/60 flex items-center justify-between text-xs text-proof-ash font-mono">
                    <div className="flex items-center gap-3">
                      {project.language && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Code2 className="h-3 w-3 text-proof-cyan" />
                          {project.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-proof-amber" />
                        {project.stargazersCount}
                      </span>
                    </div>

                    <a
                      href={project.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-proof-cyan hover:underline flex items-center gap-0.5"
                    >
                      <span>Explore Code</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer / Passport Branding */}
        <div className="pt-12 text-center border-t border-proof-border text-xs text-proof-ash space-y-2 font-mono">
          <p>
            ⚡ Proofly Connected Professional Identity · Verified via GitHub Public Ledger
          </p>
          <p>
            Want to create your own verifiable developer passport?{" "}
            <Link href="/" className="text-proof-amber hover:underline font-bold">
              Build your Proofly profile →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
