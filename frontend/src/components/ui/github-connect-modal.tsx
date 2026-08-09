"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, CheckCircle2, Lock, X, Terminal } from "lucide-react";

interface GithubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GithubConnectModal({ isOpen, onClose }: GithubConnectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-proof-obsidian/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-proof-border bg-proof-carbon p-6 sm:p-8 shadow-2xl font-mono text-xs">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1.5 text-proof-ash hover:bg-proof-obsidian hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-proof-obsidian border border-proof-amber/40 text-proof-amber shadow-lg shadow-proof-amber/10">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white">AUTHENTICATE GITHUB</h3>
                <Badge variant="amber" className="text-[10px]">OAUTH_PKCE</Badge>
              </div>
              <p className="text-[11px] text-proof-ash font-sans">Read-only identity permission token exchange</p>
            </div>
          </div>

          {/* Scope Information */}
          <div className="space-y-3 rounded-lg border border-proof-border bg-proof-obsidian p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-proof-amber">
              // REQUESTED GITHUB PERMISSIONS
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-proof-emerald shrink-0" />
                <span><strong>Read-only Repository Data</strong> (Commits, pull requests, language share)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-proof-emerald shrink-0" />
                <span><strong>Public Profile Identity</strong> (Username, avatar, public repos)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-proof-emerald shrink-0" />
                <span><strong>Contribution Matrix</strong> (Public commit activity streak)</span>
              </li>
            </ul>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 rounded-md bg-proof-obsidian border border-proof-cyan/30 p-3 text-xs text-proof-cyan">
            <Lock className="h-4 w-4 shrink-0 text-proof-cyan" />
            <span className="font-sans">OAuth 2.0 PKCE flow is configured and ready to link with backend API.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              CLOSE
            </Button>
            <Button variant="amber" size="sm" onClick={onClose} className="text-xs gap-2">
              <Github className="h-3.5 w-3.5" />
              <span>PROCEED TO GITHUB</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

