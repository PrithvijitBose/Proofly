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
          </div>
        </Link>

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
        </div>
      </div>
    </header>
  );
}