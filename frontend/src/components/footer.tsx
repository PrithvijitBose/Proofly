export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/80 py-8 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Proofly Platform. All rights reserved.</p>
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            FastAPI + Next.js Stack Active
          </span>
        </div>
      </div>
    </footer>
  );
}
