import Link from "next/link";
import { ShieldCheck, Github, Terminal, Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-proof-border bg-proof-obsidian py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-proof-carbon border border-proof-cyan/40 text-proof-cyan">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold text-white tracking-tight">PROOFLY</span>
            </Link>
            <p className="text-xs text-proof-ash max-w-sm leading-relaxed font-sans">
              Proofly links technical profiles, open-source work, and project accomplishments into a single, verifiable connected developer identity.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-proof-amber">// NAVIGATION</div>
            <ul className="space-y-2 text-proof-ash">
              <li>
                <Link href="#features" className="hover:text-proof-cyan transition-colors">
                  $ proof.pillars()
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-proof-cyan transition-colors">
                  $ proof.lifecycle()
                </Link>
              </li>
              <li>
                <Link href="#live-demo" className="hover:text-proof-cyan transition-colors">
                  $ proof.preview()
                </Link>
              </li>
              <li>
                <Link href="#system-status" className="hover:text-proof-cyan transition-colors">
                  $ proof.telemetry()
                </Link>
              </li>
            </ul>
          </div>

          {/* Technology Stack */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-proof-amber">// ARCHITECTURE</div>
            <ul className="space-y-2 text-proof-ash">
              <li className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-proof-cyan" />
                <span>FastAPI Python 3.11+</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-proof-amber" />
                <span>Next.js 15 + TypeScript</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Github className="h-3.5 w-3.5 text-proof-emerald" />
                <span>GitHub OAuth 2.0 PKCE</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-proof-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-proof-ash">
          <p>© {new Date().getFullYear()} PROOFLY PLATFORM. VERIFIABLE IDENTITY LEDGER.</p>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-proof-carbon border border-proof-emerald/30 px-3 py-1 text-proof-emerald text-[11px]">
              <span className="h-2 w-2 rounded-full bg-proof-emerald animate-ping" />
              SYSTEM_STATUS::ONLINE
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

