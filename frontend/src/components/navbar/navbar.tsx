"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldCheck } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Proofly
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#architecture" className="hover:text-foreground transition-colors">
            Architecture
          </Link>
          <Link href="#health" className="hover:text-foreground transition-colors">
            System Health
          </Link>
        </nav>

        {/* Action / Status Badge */}
        <div className="flex items-center gap-3">
          <Badge variant="default" className="hidden sm:inline-flex gap-1 py-1 px-3">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Boilerplate Ready</span>
          </Badge>
        </div>
      </div>
    </header>
  );
}
