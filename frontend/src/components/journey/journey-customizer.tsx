"use client";

import { useState } from "react";
import { Sparkles, SlidersHorizontal, RefreshCw, Wand2, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TONE_PRESETS, type JourneyTone } from "@/lib/github/ai-journey";

interface JourneyCustomizerProps {
  currentTone?: string;
  currentPrompt?: string;
  isGenerating: boolean;
  onRegenerate: (options: { tone: string; customPrompt: string }) => void;
}

const PROMPT_SUGGESTIONS = [
  "Focus more on my open-source contributions and architecture decisions.",
  "Make this concise and impactful for senior engineering recruiters.",
  "Highlight my journey transitioning across languages and backend systems.",
  "Tell my story like an inspiring founder/builder narrative.",
];

export function JourneyCustomizer({
  currentTone = "Professional",
  currentPrompt = "",
  isGenerating,
  onRegenerate,
}: JourneyCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState<string>(currentTone);
  const [promptText, setPromptText] = useState<string>(currentPrompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegenerate({
      tone: selectedTone,
      customPrompt: promptText.trim(),
    });
  };

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-background/60 shadow-lg backdrop-blur-md">
      {/* Header / Toggle bar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-primary/5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Customize Story & Tone</h3>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-primary">
                {selectedTone}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct the AI on tone, emphasis, and focus areas to match your goals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <span>{isOpen ? "Hide Controls" : "Customize"}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Controls Drawer */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="border-t border-border/40 p-6 space-y-6">
          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Tone Preset
            </label>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {TONE_PRESETS.map((tone: JourneyTone) => {
                const isActive = selectedTone === tone;
                return (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setSelectedTone(tone)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40"
                        : "border border-border/70 bg-background/80 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {tone}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="custom-instructions" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Custom Instructions & Focus
              </label>
              <span className="font-mono text-[10px] text-muted-foreground">
                {promptText.length} / 1000
              </span>
            </div>
            <textarea
              id="custom-instructions"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value.slice(0, 1000))}
              placeholder="e.g. Make this professional and concise, suitable for a software engineering resume. Focus on my backend architectures..."
              rows={3}
              className="mt-2 w-full resize-y rounded-xl border border-border/70 bg-background/70 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* Quick Inspiration Chips */}
            <div className="mt-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground/80">Try an idea:</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPromptText(suggestion)}
                    className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTone("Professional");
                setPromptText("");
              }}
              className="text-xs text-muted-foreground"
            >
              Reset to Defaults
            </Button>

            <Button
              type="submit"
              disabled={isGenerating}
              size="sm"
              className="font-semibold shadow-md"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  Regenerate Story
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
