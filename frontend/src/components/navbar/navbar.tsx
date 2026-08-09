import Link from "next/link";
import { auth } from "@/auth";
import { Sparkles, ShieldCheck } from "lucide-react";
import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import { GitHubSignOutButton } from "@/components/auth/github-sign-out-button";

export async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
              Proofly
            </span>
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal, Github, Menu, X } from "lucide-react";
import { GithubConnectModal } from "@/components/ui/github-connect-modal";

interface NavbarProps {
  onOpenConnectModal?: () => void;
}

export function Navbar({ onOpenConnectModal }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConnectClick = () => {
    if (onOpenConnectModal) {
      onOpenConnectModal();
    } else {
      setIsModalOpen(true);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-nav transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-proof-carbon border border-proof-cyan/40 text-proof-cyan shadow-sm shadow-proof-cyan/20 transition-all duration-300 group-hover:border-proof-amber group-hover:text-proof-amber">
              <Terminal className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-tight text-white group-hover:text-proof-cyan transition-colors">
                  PROOFLY
                </span>
                <Badge variant="verified" className="text-[10px] py-0 px-1.5 font-mono hidden sm:inline-flex">
                  PGP::VERIFIED
                </Badge>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-mono text-slate-400">
            <Link href="#live-demo" className="hover:text-proof-cyan transition-colors flex items-center gap-1.5">
              <span className="text-proof-amber">$</span> proof.preview()
            </Link>
            <Link href="#features" className="hover:text-proof-cyan transition-colors flex items-center gap-1.5">
              <span className="text-proof-amber">$</span> proof.pillars()
            </Link>
            <Link href="#how-it-works" className="hover:text-proof-cyan transition-colors flex items-center gap-1.5">
              <span className="text-proof-amber">$</span> proof.lifecycle()
            </Link>
            <Link href="#system-status" className="hover:text-proof-cyan transition-colors flex items-center gap-1.5">
              <span className="text-proof-emerald">●</span> telemetry
            </Link>
          </nav>

          {/* Action / Connect GitHub CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="amber"
              size="sm"
              onClick={handleConnectClick}
              className="gap-2 text-xs font-mono tracking-tight"
            >
              <Github className="h-3.5 w-3.5" />
              <span>AUTHENTICATE GITHUB</span>
            </Button>
          </div>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link href="#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#architecture" className="transition-colors hover:text-foreground">
            Architecture
          </Link>
          <Link href="#health" className="transition-colors hover:text-foreground">
            System Health
          </Link>
          <Link href="/journey" className="transition-colors hover:text-foreground">
            My Journey
          </Link>
        </nav>

        {/* Auth / Status */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/journey"
                className="hidden items-center gap-2 rounded-full border border-border bg-background/50 py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:bg-accent sm:flex"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatar} alt={user.login ?? ""} className="h-6 w-6 rounded-full" />
                <span className="max-w-[120px] truncate text-xs">{user.name ?? user.login}</span>
              </Link>
              <GitHubSignOutButton />
            </>
          ) : (
            <GitHubSignInButton label="Connect GitHub" />
          )}
          <span className="hidden items-center gap-1 border-l border-border/40 pl-3 sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
            <span className="text-xs text-muted-foreground">GitHub Stories Live</span>
          </span>
          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="amber"
              size="sm"
              onClick={handleConnectClick}
              className="gap-1.5 text-xs font-mono px-3 py-1.5"
            >
              <Github className="h-3.5 w-3.5" />
              <span>AUTH</span>
            </Button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-proof-carbon rounded-md transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-proof-border bg-proof-obsidian/95 p-4 space-y-3 font-mono text-xs backdrop-blur-xl">
            <Link
              href="#live-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-proof-cyan transition-colors"
            >
              <span className="text-proof-amber">$</span> proof.preview()
            </Link>
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-proof-cyan transition-colors"
            >
              <span className="text-proof-amber">$</span> proof.pillars()
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-proof-cyan transition-colors"
            >
              <span className="text-proof-amber">$</span> proof.lifecycle()
            </Link>
            <Link
              href="#system-status"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-300 hover:text-proof-cyan transition-colors"
            >
              <span className="text-proof-emerald">●</span> telemetry
            </Link>
          </div>
        )}
      </header>

      {/* Integration with GithubConnectModal */}
      <GithubConnectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}