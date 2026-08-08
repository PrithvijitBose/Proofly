"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchBackendHealth, HealthResponse } from "@/lib/api/health";
import { Code2, GitFork, QrCode, Server, ShieldCheck, ArrowRight, RefreshCw, Layers } from "lucide-react";

export default function Home() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute top-12 left-1/2 -z-10 -translate-x-1/2 blur-3xl opacity-20">
        <div className="h-[400px] w-[700px] bg-gradient-to-tr from-primary via-indigo-500 to-purple-600 rounded-full" />
      </div>

      <div className="mx-auto max-w-5xl space-y-16">
        {/* Hero Section Placeholder */}
        <section className="text-center space-y-6 pt-4">
          <Badge variant="default" className="px-4 py-1 text-sm rounded-full">
            Platform Boilerplate Initialized
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Connected Professional Identity
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Complementing traditional resumes with a unified, shareable profile linking code repositories, open-source work, and technical projects.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button size="lg" className="gap-2">
              <span>View Architecture</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={checkHealth}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Test API Link</span>
            </Button>
          </div>
        </section>

        {/* Backend Health Check Widget */}
        <section id="health" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <span>Backend Connection Service</span>
            </h2>
            <Button size="sm" variant="ghost" onClick={checkHealth} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          </div>

          <Card className="relative overflow-hidden border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">FastAPI Service Status</CardTitle>
                {loading ? (
                  <Badge variant="outline" className="animate-pulse">Connecting...</Badge>
                ) : healthData ? (
                  <Badge variant="success" className="gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Operational
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-400">
                    Offline / Connecting
                  </Badge>
                )}
              </div>
              <CardDescription>
                Live response from FastAPI endpoint <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">/api/v1/health</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-sm">
                  <div className="p-3 rounded-xl bg-background/40 border border-border/40">
                    <span className="text-xs text-muted-foreground block">Service Name</span>
                    <span className="font-semibold text-foreground">{healthData.project_name}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-background/40 border border-border/40">
                    <span className="text-xs text-muted-foreground block">API Version</span>
                    <span className="font-semibold font-mono text-foreground">{healthData.version}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-background/40 border border-border/40">
                    <span className="text-xs text-muted-foreground block">Backend URL</span>
                    <span className="font-semibold font-mono text-xs text-foreground truncate block">{healthData.backend_url}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-background/30 border border-border/40 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {error || "Start backend with `python -m uvicorn app.main:app --reload --port 8000` inside `backend/` directory."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Modular Architecture Preview */}
        <section id="architecture" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Boilerplate Foundations</h2>
            <p className="text-sm text-muted-foreground">Clean, unburdened baseline designed for future modular expansion.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Layers className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">FastAPI Backend</CardTitle>
                <CardDescription>
                  Python 3.11+ backend with Pydantic Settings, CORS middleware, and API v1 routing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Code2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Next.js App Router</CardTitle>
                <CardDescription>
                  TypeScript, layout templates, glassmorphism design system, and reusable UI components.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <QrCode className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Identity Vision</CardTitle>
                <CardDescription>
                  Shareable profile link & QR code integration ready for future platform milestones.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
