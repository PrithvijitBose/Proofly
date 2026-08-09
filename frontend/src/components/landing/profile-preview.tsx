"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Github,
  Star,
  GitFork,
  GitPullRequest,
  Code2,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Award,
  Terminal,
  Key,
} from "lucide-react";

export function ProfilePreview() {
  const [activeTab, setActiveTab] = useState<"repos" | "activity" | "skills">("repos");
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const profileUrl = "https://proofly.dev/alex-dev";
  const pgpSignature = "PGP-SHA256::8F3B-2A9D-4E11-9C0A";

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-xl border border-proof-border bg-proof-carbon/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-proof-cyan/40">
      {/* Top Header & PGP Fingerprint Banner */}
      <div className="flex items-center justify-between gap-2 pb-4 mb-6 border-b border-proof-border font-mono text-[11px] text-proof-ash">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-proof-amber" />
          <span>PROOFLY_LEDGER_NODE_01 // </span>
          <span className="text-proof-cyan hidden sm:inline">{pgpSignature}</span>
        </div>
        <Badge variant="verified" className="text-[10px] px-2 py-0.5 font-mono">
          AUTHENTICATED_PROOFS
        </Badge>
      </div>

      {/* Profile Header Block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-proof-border">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-proof-obsidian border border-proof-cyan/40 text-proof-cyan font-mono font-bold text-xl shadow-lg shadow-proof-cyan/10">
              AD
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-proof-amber text-black shadow-md">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-2xl font-bold text-white tracking-tight">Alex Morgan</h3>
              <Badge variant="amber" className="gap-1 text-[10px]">
                <Key className="h-3 w-3" />
                VERIFIED KEY
              </Badge>
              <Badge variant="obsidian" className="gap-1 text-[10px] font-mono">
                <Github className="h-3 w-3" />
                @alex-dev
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Senior Systems Architect & Open Source Maintainer • San Francisco, CA
            </p>
          </div>
        </div>

        {/* Share & QR Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end font-mono">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs font-mono border-proof-border hover:bg-proof-obsidian"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-proof-emerald" /> : <Copy className="h-3.5 w-3.5 text-proof-ash" />}
            <span>{copied ? "COPIED" : "SHARE LINK"}</span>
          </Button>

          <Button
            variant="proof"
            size="sm"
            onClick={() => setShowQrModal(!showQrModal)}
            className="gap-1.5 text-xs"
          >
            <QrCode className="h-3.5 w-3.5 text-proof-cyan" />
            <span>QR CARD</span>
          </Button>
        </div>
      </div>

      {/* Developer Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
        <div className="rounded-lg border border-proof-border bg-proof-obsidian/80 p-4 transition-colors hover:border-proof-cyan/40">
          <span className="text-[11px] text-proof-ash font-mono flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5 text-proof-cyan" />
            VERIFIED_COMMITS
          </span>
          <div className="text-2xl font-mono font-bold text-white mt-1">1,482</div>
          <span className="text-[10px] text-proof-emerald font-mono">TOP 5% GLOBAL STREAK</span>
        </div>

        <div className="rounded-lg border border-proof-border bg-proof-obsidian/80 p-4 transition-colors hover:border-proof-amber/40">
          <span className="text-[11px] text-proof-ash font-mono flex items-center gap-1.5">
            <GitPullRequest className="h-3.5 w-3.5 text-proof-amber" />
            MERGED_PRS
          </span>
          <div className="text-2xl font-mono font-bold text-white mt-1">184</div>
          <span className="text-[10px] text-proof-ash font-mono">12 PUBLIC REPOS</span>
        </div>

        <div className="rounded-lg border border-proof-border bg-proof-obsidian/80 p-4 transition-colors hover:border-proof-cyan/40">
          <span className="text-[11px] text-proof-ash font-mono flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-proof-cyan" />
            STREAK_DAYS
          </span>
          <div className="text-2xl font-mono font-bold text-white mt-1">42</div>
          <span className="text-[10px] text-proof-cyan font-mono">ACTIVE DAILY STREAK</span>
        </div>

        <div className="rounded-lg border border-proof-border bg-proof-obsidian/80 p-4 transition-colors hover:border-proof-emerald/40">
          <span className="text-[11px] text-proof-ash font-mono flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-proof-emerald" />
            PROOF_SCORE
          </span>
          <div className="text-2xl font-mono font-bold text-proof-emerald mt-1">98/100</div>
          <span className="text-[10px] text-proof-emerald font-mono">VERIFIED TRUST INDEX</span>
        </div>
      </div>

      {/* Terminal Interactive Tabs */}
      <div className="flex items-center gap-2 border-b border-proof-border pb-3 font-mono text-xs">
        <button
          onClick={() => setActiveTab("repos")}
          className={`px-3 py-1.5 rounded-md transition-all ${
            activeTab === "repos"
              ? "bg-proof-obsidian text-proof-cyan border border-proof-cyan/40"
              : "text-proof-ash hover:text-white hover:bg-proof-obsidian/50"
          }`}
        >
          [ repositories.json ]
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-3 py-1.5 rounded-md transition-all ${
            activeTab === "activity"
              ? "bg-proof-obsidian text-proof-amber border border-proof-amber/40"
              : "text-proof-ash hover:text-white hover:bg-proof-obsidian/50"
          }`}
        >
          [ activity.log ]
        </button>
        <button
          onClick={() => setActiveTab("skills")}
          className={`px-3 py-1.5 rounded-md transition-all ${
            activeTab === "skills"
              ? "bg-proof-obsidian text-proof-emerald border border-proof-emerald/40"
              : "text-proof-ash hover:text-white hover:bg-proof-obsidian/50"
          }`}
        >
          [ tech_stack.matrix ]
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="pt-4 min-h-[220px]">
        {activeTab === "repos" && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-proof-border bg-proof-obsidian/60 hover:border-proof-cyan/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white hover:text-proof-cyan cursor-pointer flex items-center gap-1">
                    quantum-cache-engine
                    <ExternalLink className="h-3 w-3 text-proof-ash" />
                  </span>
                  <Badge variant="cyan" className="text-[10px]">TypeScript</Badge>
                  <Badge variant="amber" className="text-[10px]">VERIFIED_CORE_DEV</Badge>
                </div>
                <p className="text-xs text-slate-400 font-sans line-clamp-1">
                  Distributed low-latency in-memory cache system with zero-allocation RPC.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-proof-ash shrink-0">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-proof-amber" /> 1.2k</span>
                <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" /> 148</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-proof-border bg-proof-obsidian/60 hover:border-proof-cyan/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white hover:text-proof-cyan cursor-pointer flex items-center gap-1">
                    fastapi-micro-auth
                    <ExternalLink className="h-3 w-3 text-proof-ash" />
                  </span>
                  <Badge variant="amber" className="text-[10px]">Python</Badge>
                  <Badge variant="verified" className="text-[10px]">AUTHOR</Badge>
                </div>
                <p className="text-xs text-slate-400 font-sans line-clamp-1">
                  Asynchronous JWT OAuth2 authentication middleware for Python FastAPI.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-proof-ash shrink-0">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-proof-amber" /> 840</span>
                <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" /> 92</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-proof-border bg-proof-obsidian/60 hover:border-proof-cyan/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white hover:text-proof-cyan cursor-pointer flex items-center gap-1">
                    vector-db-cli
                    <ExternalLink className="h-3 w-3 text-proof-ash" />
                  </span>
                  <Badge variant="telemetry" className="text-[10px]">Rust</Badge>
                  <Badge variant="obsidian" className="text-[10px]">MAINTAINER</Badge>
                </div>
                <p className="text-xs text-slate-400 font-sans line-clamp-1">
                  High-throughput CLI utility for embedding vector indices into local SQLite.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-proof-ash shrink-0">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-proof-amber" /> 430</span>
                <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" /> 35</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-lg border border-proof-border bg-proof-obsidian/60">
              <div className="h-2 w-2 rounded-full bg-proof-emerald mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-white">MERGE_PR #142 $\rightarrow$ quantum-cache-engine</span>
                <p className="text-slate-400 font-sans mt-0.5">Optimized LRU buffer pool eviction logic, reducing memory allocations by 24%.</p>
                <span className="text-[10px] text-proof-ash mt-1 block font-mono">2 hours ago • SHA-256 Digest Verified</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-lg border border-proof-border bg-proof-obsidian/60">
              <div className="h-2 w-2 rounded-full bg-proof-amber mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-white">COMMIT_PUSH [4 commits] $\rightarrow$ fastapi-micro-auth</span>
                <p className="text-slate-400 font-sans mt-0.5">Added PKCE support to GitHub OAuth handler flow.</p>
                <span className="text-[10px] text-proof-ash mt-1 block font-mono">Yesterday • GPG Signature Verified</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-proof-cyan">TypeScript / Next.js</span>
                <span className="text-proof-ash">48% of total commits</span>
              </div>
              <div className="h-2 w-full rounded-md bg-proof-obsidian overflow-hidden border border-proof-border">
                <div className="h-full bg-proof-cyan rounded-md" style={{ width: "48%" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-proof-amber">Python / FastAPI</span>
                <span className="text-proof-ash">32% of total commits</span>
              </div>
              <div className="h-2 w-full rounded-md bg-proof-obsidian overflow-hidden border border-proof-border">
                <div className="h-full bg-proof-amber rounded-md" style={{ width: "32%" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-proof-emerald">Rust / Systems</span>
                <span className="text-proof-ash">20% of total commits</span>
              </div>
              <div className="h-2 w-full rounded-md bg-proof-obsidian overflow-hidden border border-proof-border">
                <div className="h-full bg-proof-emerald rounded-md" style={{ width: "20%" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal preview when clicked */}
      {showQrModal && (
        <div className="mt-4 p-4 rounded-lg border border-proof-cyan/40 bg-proof-obsidian flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-white text-black font-mono text-[9px] grid grid-cols-5 gap-1 shrink-0">
              <div className="w-3.5 h-3.5 bg-black rounded-xs" />
              <div className="w-3.5 h-3.5 bg-black rounded-xs" />
              <div className="w-3.5 h-3.5 bg-proof-amber rounded-xs" />
              <div className="w-3.5 h-3.5 bg-black rounded-xs" />
              <div className="w-3.5 h-3.5 bg-black rounded-xs" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-proof-cyan" />
                Proofly Passport Mobile QR
              </div>
              <p className="text-[11px] text-proof-ash font-sans">
                Scan with smartphone camera to view Alex Morgan&apos;s verified cryptographic identity card.
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="text-xs text-proof-ash" onClick={() => setShowQrModal(false)}>
            DISMISS
          </Button>
        </div>
      )}
    </div>
  );
}

