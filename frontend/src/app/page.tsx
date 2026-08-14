"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubConnectModal } from "@/components/ui/github-connect-modal";
import { ProfilePreview } from "@/components/landing/profile-preview";
import { fetchBackendHealth, HealthResponse } from "@/lib/api/health";
import {
  GitBranch,
  QrCode,
  Server,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Github,
  Terminal,
  Cpu,
  Lock,
  Zap,
  Award,
  CheckCircle2,
  GitCommit,
  Key,
} from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

function HomeContent() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState<boolean>(false);
  const [patRedirectBanner, setPatRedirectBanner] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Auto-open PAT modal when redirected from auth callback (?auth=pat)
  useEffect(() => {
    if (searchParams.get("auth") === "pat") {
      setConnectModalOpen(true);
      const message = searchParams.get("message");
      if (message) {
        setPatRedirectBanner(message);
      }
      // Clean up the URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBackendHealth();
      setHealthData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to FastAPI backend");
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="relative overflow-hidden bg-grid-pattern pb-24">
      {/* Contributor PAT redirect banner */}
      {patRedirectBanner && (
        <div className="w-full border-b border-amber-500/30 bg-amber-950/40 py-3 px-4">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-200 font-mono">
              <Key className="h-3.5 w-3.5 text-proof-amber shrink-0" />
              <span>{patRedirectBanner} Click <strong className="text-proof-amber">"Use PAT"</strong> below to sign in.</span>
            </div>
            <button
              onClick={() => setPatRedirectBanner(null)}
              className="text-amber-400/60 hover:text-amber-200 transition-colors text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Monospaced Live Commit Stream Ticker */}
      <div className="w-full border-b border-proof-border bg-proof-obsidian/90 py-2.5 overflow-hidden font-mono text-xs text-proof-ash">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-proof-amber shrink-0 font-bold">
            <Terminal className="h-3.5 w-3.5" />
            <span>LIVE_GIT_TELEMETRY:</span>
          </div>

          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar whitespace-nowrap text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <GitCommit className="h-3 w-3 text-proof-cyan" />
              <code className="text-proof-cyan font-bold">8f3b2a9</code> feat: zero-allocation RPC buffer pool
            </span>
            <span className="text-proof-border">|</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <GitCommit className="h-3 w-3 text-proof-amber" />
              <code className="text-proof-amber font-bold">9d1e4c2</code> fix: OAuth2 PKCE handler exchange
            </span>
            <span className="text-proof-border">|</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <GitCommit className="h-3 w-3 text-proof-emerald" />
              <code className="text-proof-emerald font-bold">a12b3c4</code> release: v1.4.0 verified identity ledger
            </span>
          </div>

          <Badge variant="telemetry" className="hidden lg:inline-flex text-[10px] shrink-0">
            NODE_STATUS::OK
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-28 pt-12 sm:pt-20">
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-center">
            <Badge variant="amber" className="px-4 py-1.5 text-xs gap-2 rounded-md shadow-glow-amber">
              <Key className="h-3.5 w-3.5 text-proof-amber" />
              <span>AUTHENTICATED DEVELOPER IDENTITY LEDGER</span>
            </Badge>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Your code commits are your true credentials.
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed font-sans">
            Proofly transforms public GitHub contributions, verified commit streaks, and merged pull requests into an unforgeable, shareable developer passport.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/journey" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90">
              <GitHubIcon className="h-5 w-5 mr-2" />
              My GitHub Journey
            </Link>
            <Button size="lg" variant="outline" className="gap-2" onClick={checkHealth}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Test API Link</span>
            </Button>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 font-mono">
            <Button
              variant="amber"
              size="xl"
              onClick={() => setConnectModalOpen(true)}
              className="w-full sm:w-auto gap-3 text-sm shadow-glow-amber"
            >
              <Github className="h-5 w-5" />
              <span>AUTHENTICATE GITHUB PROFILE</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <a href="#live-demo" className="w-full sm:w-auto">
              <Button variant="outline" size="xl" className="w-full sm:w-auto gap-2 text-sm border-proof-border">
                <Terminal className="h-4 w-4 text-proof-cyan" />
                <span>EXPLORE PASSPORT DEMO</span>
              </Button>
            </a>
          </div>

          {/* Verification Guarantees Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-proof-ash font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-proof-emerald" />
              READ-ONLY PERMISSIONS
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-proof-emerald" />
              ZERO CODE MODIFICATION
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-proof-amber" />
              MOBILE QR PASSPORT CARD
            </span>
          </div>
        </section>

        {/* Live Interactive Profile Showcase Section */}
        <section id="live-demo" className="space-y-6 scroll-mt-24">
          <div className="text-center space-y-3">
            <Badge variant="cyan" className="px-3 py-1 font-mono">
              [ INTERACTIVE PASSPORT DEMO ]
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Experience the Proofly Identity Passport
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-sans">
              Test how your connected developer credentials appear to engineering leads, hiring managers, and open source communities.
            </p>
          </div>

          <ProfilePreview />
        </section>

        {/* Core Value Pillars Section */}
        <section id="features" className="space-y-12 scroll-mt-24">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="amber" className="px-3 py-1 font-mono">
              [ PRODUCT PILLARS ]
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Built for Modern Software Engineers
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-sans">
              Beyond text bullet points — present verifiable proofs of your engineering consistency, commit velocity, and technical impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="proof-card hover:border-proof-cyan/40 transition-all duration-300">
              <CardHeader>
                <div className="h-10 w-10 rounded-md bg-proof-obsidian border border-proof-cyan/30 text-proof-cyan flex items-center justify-center mb-3 font-mono">
                  <GitBranch className="h-5 w-5" />
                </div>
                <CardTitle className="font-display text-lg font-bold text-white">Automated GitHub Sync</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                  Imports public repository contributions, pull request volume, commit velocity, and language share via read-only OAuth.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="proof-card hover:border-proof-amber/40 transition-all duration-300">
              <CardHeader>
                <div className="h-10 w-10 rounded-md bg-proof-obsidian border border-proof-amber/30 text-proof-amber flex items-center justify-center mb-3 font-mono">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="font-display text-lg font-bold text-white">Proof of Work Verification</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                  Turn raw commit digests into verified portfolio achievements. Validates authorship, project roles, and contribution streaks.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="proof-card hover:border-proof-emerald/40 transition-all duration-300">
              <CardHeader>
                <div className="h-10 w-10 rounded-md bg-proof-obsidian border border-proof-emerald/30 text-proof-emerald flex items-center justify-center mb-3 font-mono">
                  <QrCode className="h-5 w-5" />
                </div>
                <CardTitle className="font-display text-lg font-bold text-white">Unified Mobile QR Card</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                  Replace outdated static resumes with a single live passport link and mobile QR badge ready for conferences and applications.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="proof-card hover:border-proof-cyan/40 transition-all duration-300">
              <CardHeader>
                <div className="h-10 w-10 rounded-md bg-proof-obsidian border border-proof-cyan/30 text-proof-cyan flex items-center justify-center mb-3 font-mono">
                  <Cpu className="h-5 w-5" />
                </div>
                <CardTitle className="font-display text-lg font-bold text-white">High-Signal Telemetry</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                  Give technical recruiters raw code metrics and verifiable telemetry signals beyond resume keywords.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Git Proof Lifecycle Matrix (Sequence Section) */}
        <section id="how-it-works" className="space-y-12 scroll-mt-24">
          <div className="text-center space-y-3">
            <Badge variant="telemetry" className="px-3 py-1 font-mono">
              [ GIT PROOF LIFECYCLE ]
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              How Proofly Verifies Your Identity
            </h2>
            <p className="text-sm sm:text-base text-slate-400 font-sans">
              From raw git commits to cryptographic proof badge in three transparent phases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
            <div className="proof-card p-6 space-y-4 relative overflow-hidden">
              <div className="text-xs text-proof-amber font-bold flex items-center justify-between">
                <span>PHASE_01 // AUTHENTICATION</span>
                <Lock className="h-3.5 w-3.5 text-proof-amber" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Connect GitHub OAuth</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Authenticate via standard GitHub OAuth 2.0. Read-only permissions guarantee your code remains 100% private and unmodified.
              </p>
              <Button
                variant="proof"
                size="sm"
                onClick={() => setConnectModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <span>INITIATE_OAUTH</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="proof-card p-6 space-y-4 relative overflow-hidden">
              <div className="text-xs text-proof-cyan font-bold flex items-center justify-between">
                <span>PHASE_02 // COMPILATION</span>
                <Cpu className="h-3.5 w-3.5 text-proof-cyan" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Compile SHA-256 Digest</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Proofly parses commit velocity, repository roles, and merged PRs to compile your verified Proof Score and key fingerprint.
              </p>
            </div>

            <div className="proof-card p-6 space-y-4 relative overflow-hidden">
              <div className="text-xs text-proof-emerald font-bold flex items-center justify-between">
                <span>PHASE_03 // VERIFICATION</span>
                <ShieldCheck className="h-3.5 w-3.5 text-proof-emerald" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Publish Developer Passport</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Share your live Proofly URL or QR passport on your resume, LinkedIn bio, and GitHub README for instant engineering trust.
              </p>
            </div>
          </div>
        </section>

        {/* High Conversion Action Banner */}
        <section className="proof-card p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-proof-amber/10 blur-3xl" />

          <Badge variant="amber" className="px-4 py-1 text-xs font-mono">
            PGP::READY_FOR_AUTHENTICATION
          </Badge>

          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight max-w-2xl mx-auto">
            Ready to showcase your authenticated developer credentials?
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto font-sans">
            Connect your GitHub account today and transform raw commits into a verified professional portfolio badge.
          </p>

          <div className="pt-2 flex justify-center font-mono">
            <Button
              variant="amber"
              size="xl"
              onClick={() => setConnectModalOpen(true)}
              className="gap-3 shadow-glow-amber text-sm font-bold"
            >
              <Github className="h-5 w-5" />
              <span>AUTHENTICATE GITHUB ACCOUNT</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Backend Connection Telemetry Status Section */}
        <section id="system-status" className="space-y-4 scroll-mt-24 font-mono">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2 text-white">
              <Server className="h-4 w-4 text-proof-cyan" />
              <span>FASTAPI_BACKEND_TELEMETRY</span>
            </h2>
            <Button size="sm" variant="ghost" onClick={checkHealth} disabled={loading} className="gap-1.5 text-xs text-proof-ash hover:text-white">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              REFRESH
            </Button>
          </div>

          <Card className="proof-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-white font-mono">HEALTH_CHECK :: /api/v1/health</CardTitle>
                {loading ? (
                  <Badge variant="outline" className="animate-pulse">CONNECTING...</Badge>
                ) : healthData ? (
                  <Badge variant="success" className="gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-proof-emerald animate-ping" />
                    ONLINE::OPERATIONAL
                  </Badge>
                ) : (
                  <Badge variant="obsidian" className="text-red-400 border-red-500/40">
                    OFFLINE / DISCONNECTED
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-proof-ash font-mono">
                Live JSON endpoint response from Python FastAPI server.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-md bg-proof-obsidian border border-proof-border">
                    <span className="text-proof-ash block">SERVICE_NAME</span>
                    <span className="font-bold text-white">{healthData.project_name}</span>
                  </div>
                  <div className="p-3 rounded-md bg-proof-obsidian border border-proof-border">
                    <span className="text-proof-ash block">API_VERSION</span>
                    <span className="font-bold text-proof-emerald">{healthData.version}</span>
                  </div>
                  <div className="p-3 rounded-md bg-proof-obsidian border border-proof-border">
                    <span className="text-proof-ash block">TARGET_ENDPOINT</span>
                    <span className="font-bold text-proof-cyan truncate block">{healthData.backend_url}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-md bg-proof-obsidian border border-proof-border text-center space-y-2 text-xs font-mono">
                  <p className="text-proof-ash">
                    {error || "Start FastAPI service with `python -m uvicorn app.main:app --reload --port 8000` inside `backend/`."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* GitHub Connect Modal Dialog */}
      <GithubConnectModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
