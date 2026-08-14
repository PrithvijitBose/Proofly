"use client";

import { useState } from "react";
import { Check, X, Plus, Trash2, Edit3, ArrowLeft, Save, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuardedNarrative, GuardedChapter, GuardedClaim } from "@/lib/github/guardrails";
import type { EvidenceRecord } from "@/lib/github/evidence";

interface NarrativeEditorProps {
  initialNarrative: GuardedNarrative;
  evidence: EvidenceRecord[];
  onSave: (editedNarrative: GuardedNarrative) => void;
  onCancel: () => void;
}

export function NarrativeEditor({
  initialNarrative,
  evidence,
  onSave,
  onCancel,
}: NarrativeEditorProps) {
  // Deep clone chapters for local editing
  const [chapters, setChapters] = useState<GuardedChapter[]>(() =>
    JSON.parse(JSON.stringify(initialNarrative.chapters))
  );

  const handleTitleChange = (chapterIndex: number, newTitle: string) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.index === chapterIndex ? { ...ch, title: newTitle } : ch))
    );
  };

  const handleKickerChange = (chapterIndex: number, newKicker: string) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.index === chapterIndex ? { ...ch, kicker: newKicker } : ch))
    );
  };

  const handleClaimTextChange = (chapterIndex: number, claimIndex: number, newText: string) => {
    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.index !== chapterIndex) return ch;
        const newClaims = [...ch.claims];
        newClaims[claimIndex] = { ...newClaims[claimIndex], text: newText };
        return { ...ch, claims: newClaims };
      })
    );
  };

  const handleAddClaim = (chapterIndex: number) => {
    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.index !== chapterIndex) return ch;
        const newClaim: GuardedClaim = {
          text: "New milestone or accomplishment...",
          evidenceIds: [],
          verified: false,
        };
        return { ...ch, claims: [...ch.claims, newClaim] };
      })
    );
  };

  const handleRemoveClaim = (chapterIndex: number, claimIndex: number) => {
    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.index !== chapterIndex) return ch;
        return {
          ...ch,
          claims: ch.claims.filter((_, idx) => idx !== claimIndex),
        };
      })
    );
  };

  const handleSave = () => {
    const verifiedCount = chapters.reduce(
      (sum, ch) => sum + ch.claims.filter((c) => c.verified).length,
      0
    );
    const updated: GuardedNarrative = {
      ...initialNarrative,
      chapters,
      verifiedClaimCount: verifiedCount,
    };
    onSave(updated);
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Editor Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/40 bg-primary/10 p-5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Edit3 className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-foreground">Manual Story Editor</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit wording, add personal context, remove details, or adjust tone. You have complete control over your final story.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs">
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs font-semibold shadow-md">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save & Approve Story
          </Button>
        </div>
      </div>

      {/* Chapters Editor */}
      <div className="space-y-8">
        {chapters.map((chapter) => (
          <div
            key={chapter.index}
            className="relative rounded-2xl border border-border/80 bg-background/80 p-6 shadow-sm backdrop-blur-sm transition-all focus-within:border-primary/60"
          >
            {/* Chapter Index Badge */}
            <div className="absolute -left-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground sm:flex">
              {chapter.index}
            </div>

            {/* Header: Kicker & Title Inputs */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Chapter Kicker / Subtitle
                </label>
                <input
                  type="text"
                  value={chapter.kicker}
                  onChange={(e) => handleKickerChange(chapter.index, e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. where it all began"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Chapter Title
                </label>
                <input
                  type="text"
                  value={chapter.title}
                  onChange={(e) => handleTitleChange(chapter.index, e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border/70 bg-background px-3 py-1.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. The First Line"
                />
              </div>
            </div>

            {/* Claims Editor List */}
            <div className="mt-5 space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Sentences / Paragraphs
              </label>

              {chapter.claims.map((claim, cIdx) => (
                <div
                  key={cIdx}
                  className="group relative flex items-start gap-2 rounded-xl border border-border/50 bg-background/50 p-3 transition-colors hover:border-border"
                >
                  <textarea
                    value={claim.text}
                    onChange={(e) => handleClaimTextChange(chapter.index, cIdx, e.target.value)}
                    rows={2}
                    className="w-full resize-y rounded-lg bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                    placeholder="Enter sentence..."
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveClaim(chapter.index, cIdx)}
                    title="Delete sentence"
                    className="mt-1 rounded-md p-1 text-muted-foreground opacity-60 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddClaim(chapter.index)}
                className="mt-2 text-xs border-dashed text-muted-foreground hover:text-foreground"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Sentence
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
          Cancel & Discard Edits
        </Button>
        <Button size="sm" onClick={handleSave} className="font-semibold shadow-md">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save & Approve Story
        </Button>
      </div>
    </div>
  );
}
