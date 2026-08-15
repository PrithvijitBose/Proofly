"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GitHubRepo, GitHubUser } from "@/lib/github/client";
import {
  CuratedProject,
  loadCuratedProjects,
  saveCuratedProjects,
  clearCuratedProjects,
  mapRepoToCuratedProject,
} from "@/lib/github/curation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShareProfileModal } from "@/components/profile/share-profile-modal";
import {
  loadLocalPublicProfile,
  constructPublicProfile,
  publishPublicProfile,
} from "@/lib/github/profile-store";
import { loadApprovedJourney } from "@/lib/github/custom-journey";
import {
  Star,
  GitFork,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  CheckCircle2,
  Search,
  Code2,
  Sparkles,
  Layers,
  ExternalLink,
  MessageSquare,
  BookmarkCheck,
  RotateCcw,
  QrCode,
} from "lucide-react";

interface ProjectCurationProps {
  availableRepos: GitHubRepo[];
  user: GitHubUser;
}

export function ProjectCuration({ availableRepos, user }: ProjectCurationProps) {
  const [curatedProjects, setCuratedProjects] = useState<CuratedProject[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"highlights" | "all">("highlights");
  const [mounted, setMounted] = useState<boolean>(false);
  const [hydratedUser, setHydratedUser] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    if (user?.login) {
      const saved = loadCuratedProjects(user.login);
      // Replace previous in-memory curation with loaded account data (even if empty [])
      setCuratedProjects(saved);
      setHydratedUser(user.login);
    }
  }, [user?.login]);

  useEffect(() => {
    // Prevent save effect from executing until hydration for current user completes
    if (mounted && user?.login && hydratedUser === user.login) {
      saveCuratedProjects(user.login, curatedProjects);

      // Refresh and republish public profile snapshot if an approved story or local profile exists
      const existingLocalProfile = loadLocalPublicProfile(user.login);
      const approvedJourney = loadApprovedJourney(user.login);

      if (existingLocalProfile || approvedJourney) {
        const baseNarrative = approvedJourney?.narrative ?? existingLocalProfile?.narrative;
        if (baseNarrative) {
          const updatedProfile = constructPublicProfile(
            user,
            baseNarrative,
            curatedProjects,
            existingLocalProfile?.evidence ?? [],
            existingLocalProfile?.patterns ?? [],
            {
              tone: approvedJourney?.tone ?? existingLocalProfile?.tone ?? "Professional",
              customPrompt: approvedJourney?.customPrompt ?? existingLocalProfile?.customPrompt,
            }
          );
          void publishPublicProfile(updatedProfile);
        }
      }
    }
  }, [curatedProjects, mounted, user, hydratedUser]);

  const curatedRepoIds = new Set(curatedProjects.map((p) => p.repoId));

  const filteredAvailableRepos = availableRepos.filter((repo) => {
    const query = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(query) ||
      (repo.language && repo.language.toLowerCase().includes(query)) ||
      (repo.description && repo.description.toLowerCase().includes(query))
    );
  });

  const handleSelectRepo = (repo: GitHubRepo) => {
    if (curatedRepoIds.has(repo.id)) return;
    const newPriority = curatedProjects.length + 1;
    const newProject = mapRepoToCuratedProject(repo, newPriority);
    const updated = [...curatedProjects, newProject];
    setCuratedProjects(updated);
  };

  const handleRemoveRepo = (repoId: number) => {
    const updated = curatedProjects
      .filter((p) => p.repoId !== repoId)
      .map((p, idx) => ({ ...p, priority: idx + 1 }));
    setCuratedProjects(updated);
  };

  const handleMovePriority = (repoId: number, direction: "up" | "down") => {
    const index = curatedProjects.findIndex((p) => p.repoId === repoId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === curatedProjects.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const copy = [...curatedProjects];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reindexed = copy.map((p, idx) => ({ ...p, priority: idx + 1 }));
    setCuratedProjects(reindexed);
  };

  const handleNoteChange = (repoId: number, note: string) => {
    const updated = curatedProjects.map((p) =>
      p.repoId === repoId ? { ...p, customNote: note } : p
    );
    setCuratedProjects(updated);
  };

  const handleResetCuration = () => {
    if (confirm("Are you sure you want to clear your selected project highlights?")) {
      setCuratedProjects([]);
      if (user?.login) {
        clearCuratedProjects(user.login);
      }
    }
  };

  if (!mounted || !user?.login || hydratedUser !== user.login) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs text-proof-ash">
        HYDRATING_CURATION_STATE...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Share Profile & QR Code Modal */}
      <ShareProfileModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        username={user.login}
        name={user.name}
      />

      {/* Top Header Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-proof-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-proof-amber text-xs font-mono font-bold tracking-wider">
            <BookmarkCheck className="h-4 w-4" />
            <span>PROFESSIONAL IDENTITY EVIDENCE CURATOR</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl text-white font-display">
            Curate Your Highlighted Work
          </h1>
          <p className="mt-1 text-sm text-proof-ash max-w-2xl">
            Choose which GitHub projects best represent your skills and accomplishments. You control
            your narrative — order your top projects and add custom context on why each piece matters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Badge variant="amber" className="px-3 py-1 text-xs gap-1.5 font-mono">
            <Layers className="h-3.5 w-3.5" />
            <span>{curatedProjects.length} HIGHLIGHTED</span>
          </Badge>

          {user?.login && (
            <>
              <Button
                size="sm"
                onClick={() => setShareModalOpen(true)}
                className="text-xs bg-proof-amber text-black hover:bg-proof-amber/90 font-bold font-mono gap-1"
              >
                <QrCode className="h-3.5 w-3.5" />
                Share QR
              </Button>
              <Link href={`/u/${encodeURIComponent(user.login)}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-proof-border hover:border-proof-cyan/50 font-mono text-slate-300 gap-1"
                >
                  <span>Public URL</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </>
          )}

          {curatedProjects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetCuration}
              className="text-xs border-proof-border hover:bg-red-950/40 hover:text-red-400 font-mono text-proof-ash"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-proof-border/60 pb-3">
        <button
          onClick={() => setActiveTab("highlights")}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
            activeTab === "highlights"
              ? "bg-proof-amber/10 text-proof-amber border border-proof-amber/30 shadow-glow-amber"
              : "text-proof-ash hover:text-white hover:bg-proof-carbon"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Selected Highlights ({curatedProjects.length})
        </button>

        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
            activeTab === "all"
              ? "bg-proof-cyan/10 text-proof-cyan border border-proof-cyan/30 shadow-glow"
              : "text-proof-ash hover:text-white hover:bg-proof-carbon"
          }`}
        >
          <Code2 className="h-4 w-4" />
          All GitHub Repositories ({availableRepos.length})
        </button>
      </div>

      {/* TAB 1: CURATED HIGHLIGHTS */}
      {activeTab === "highlights" && (
        <div className="space-y-6">
          {curatedProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-proof-border bg-proof-carbon/40 p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-proof-amber/10 text-proof-amber">
                <BookmarkCheck className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">No Highlighted Projects Yet</h3>
              <p className="mt-1 text-sm text-proof-ash max-w-md mx-auto">
                You haven&apos;t selected any repositories to represent your professional identity. Switch to
                the &ldquo;All GitHub Repositories&rdquo; tab to choose your top work.
              </p>
              <Button
                onClick={() => setActiveTab("all")}
                className="mt-6 bg-proof-amber text-proof-obsidian font-bold hover:bg-proof-amber/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Browse My Repositories
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-mono text-proof-ash flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-proof-cyan" />
                <span>REORDER WITH ARROWS · ADD CUSTOM HIGHLIGHT NOTES BELOW</span>
              </p>

              {curatedProjects.map((project, index) => (
                <Card
                  key={project.repoId}
                  className="border-proof-border/80 bg-proof-obsidian/80 backdrop-blur-md relative overflow-hidden transition-all hover:border-proof-amber/40"
                >
                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="amber"
                          className="font-mono text-xs px-2.5 py-0.5 font-bold"
                        >
                          PRIORITY #{project.priority}
                        </Badge>

                        {project.language && (
                          <Badge variant="cyan" className="font-mono text-[11px] px-2 py-0.5">
                            {project.language}
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-xl font-bold text-white font-display flex items-center gap-2 pt-1">
                        <a
                          href={project.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-proof-amber transition-colors flex items-center gap-1.5"
                        >
                          {project.name}
                          <ExternalLink className="h-4 w-4 opacity-50 text-proof-ash" />
                        </a>
                      </CardTitle>

                      {project.description && (
                        <CardDescription className="text-sm text-proof-ash">
                          {project.description}
                        </CardDescription>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => handleMovePriority(project.repoId, "up")}
                        className="h-8 w-8 border-proof-border hover:bg-proof-carbon text-proof-ash hover:text-white"
                        title="Move Up in Priority"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        disabled={index === curatedProjects.length - 1}
                        onClick={() => handleMovePriority(project.repoId, "down")}
                        className="h-8 w-8 border-proof-border hover:bg-proof-carbon text-proof-ash hover:text-white"
                        title="Move Down in Priority"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveRepo(project.repoId)}
                        className="h-8 w-8 border-proof-border hover:bg-red-950/50 text-proof-ash hover:text-red-400"
                        title="Remove from Highlights"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Meta stats */}
                    <div className="flex items-center gap-4 text-xs font-mono text-proof-ash">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-proof-amber" />
                        {project.stargazersCount} stars
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3.5 w-3.5 text-proof-cyan" />
                        {project.forksCount} forks
                      </span>
                    </div>

                    {/* Context / Highlight Note Textarea */}
                    <div className="space-y-1.5 pt-2 border-t border-proof-border/50">
                      <label className="text-xs font-mono font-semibold text-proof-amber flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>WHY THIS PROJECT REPRESENTS MY WORK:</span>
                      </label>
                      <textarea
                        value={project.customNote}
                        onChange={(e) => handleNoteChange(project.repoId, e.target.value)}
                        placeholder="Add context... (e.g. 'Lead architect for RPC parser; improved throughput by 40% in production')"
                        rows={2}
                        className="w-full rounded-lg border border-proof-border bg-proof-carbon/70 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-proof-amber focus:outline-none focus:ring-1 focus:ring-proof-amber"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL REPOSITORIES */}
      {activeTab === "all" && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-proof-ash" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories by name, language, or description..."
              className="w-full rounded-xl border border-proof-border bg-proof-obsidian px-10 py-2.5 text-sm text-white placeholder:text-proof-ash focus:border-proof-cyan focus:outline-none focus:ring-1 focus:ring-proof-cyan"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAvailableRepos.map((repo) => {
              const isSelected = curatedRepoIds.has(repo.id);
              return (
                <Card
                  key={repo.id}
                  className={`border transition-all ${
                    isSelected
                      ? "border-proof-amber/50 bg-proof-amber/5 shadow-glow-amber"
                      : "border-proof-border bg-proof-obsidian/60 hover:border-proof-border/80"
                  }`}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-white font-display">
                          {repo.name}
                        </CardTitle>
                        {repo.language && (
                          <Badge variant="cyan" className="font-mono text-[10px] px-1.5 py-0">
                            {repo.language}
                          </Badge>
                        )}
                      </div>
                      {repo.description && (
                        <CardDescription className="text-xs text-proof-ash line-clamp-2">
                          {repo.description}
                        </CardDescription>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={isSelected ? "outline" : "default"}
                      onClick={() =>
                        isSelected ? handleRemoveRepo(repo.id) : handleSelectRepo(repo)
                      }
                      className={
                        isSelected
                          ? "border-proof-amber text-proof-amber hover:bg-red-950/40 hover:text-red-400 text-xs shrink-0"
                          : "bg-proof-cyan text-proof-obsidian font-bold hover:bg-proof-cyan/90 text-xs shrink-0"
                      }
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Highlight
                        </>
                      )}
                    </Button>
                  </CardHeader>

                  <CardContent className="p-4 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-proof-ash">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-proof-amber" />
                          {repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3 w-3 text-proof-cyan" />
                          {repo.forks_count}
                        </span>
                      </div>

                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white flex items-center gap-1 text-[10px]"
                      >
                        GitHub <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
