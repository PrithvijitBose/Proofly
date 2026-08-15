import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "emerald"
    | "github"
    | "verified"
    | "amber"
    | "cyan"
    | "telemetry"
    | "obsidian";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-mono font-medium transition-all focus:outline-none focus:ring-1 focus:ring-proof-amber tracking-tight",
        {
          "bg-proof-carbon text-proof-cyan border border-proof-cyan/30 shadow-sm shadow-proof-cyan/10":
            variant === "default" || variant === "cyan",
          "bg-proof-carbon text-slate-300 border border-proof-border":
            variant === "secondary",
          "text-slate-300 border border-proof-border bg-proof-obsidian/80 backdrop-blur-sm":
            variant === "outline",
          "border-proof-emerald/30 bg-proof-emerald/10 text-proof-emerald":
            variant === "success" || variant === "emerald",
          "border-proof-amber/40 bg-proof-amber/15 text-proof-amber shadow-sm shadow-proof-amber/20":
            variant === "verified" || variant === "amber",
          "border-[#2da44e]/40 bg-[#2da44e]/15 text-emerald-300":
            variant === "github",
          "border-proof-cyan/40 bg-proof-cyan/10 text-proof-cyan font-mono":
            variant === "telemetry",
          "border-proof-border bg-proof-obsidian text-slate-400":
            variant === "obsidian",
        },
        className
      )}
      {...props}
    />
  );
}
