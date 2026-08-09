import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "github" | "glow" | "amber" | "proof";
  size?: "default" | "sm" | "lg" | "xl" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-proof-amber disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-proof-cyan text-black hover:bg-cyan-300 font-bold shadow-lg shadow-proof-cyan/20 hover:shadow-proof-cyan/40": variant === "default",
            "border border-proof-border bg-proof-carbon/80 hover:bg-proof-carbon text-slate-200 hover:text-white backdrop-blur-md hover:border-proof-cyan/50": variant === "outline",
            "hover:bg-proof-carbon/60 hover:text-slate-100 text-slate-400": variant === "ghost",
            "bg-proof-carbon text-slate-200 hover:bg-proof-border": variant === "secondary",
            "bg-[#2da44e] text-white hover:bg-[#2c974b] shadow-lg shadow-[#2da44e]/25 hover:shadow-[#2da44e]/40 border border-emerald-400/20 font-bold": variant === "github",
            "bg-proof-amber text-black hover:bg-amber-300 font-bold shadow-lg shadow-proof-amber/25 hover:shadow-proof-amber/40 border border-amber-300/40": variant === "amber",
            "bg-gradient-to-r from-proof-cyan via-teal-400 to-proof-amber text-black font-bold shadow-lg shadow-proof-cyan/20 hover:shadow-proof-cyan/40": variant === "glow",
            "bg-proof-carbon border border-proof-cyan/40 text-proof-cyan hover:bg-proof-cyan/10 font-mono text-xs": variant === "proof",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-12 rounded-lg px-6 text-base font-semibold": size === "lg",
            "h-14 rounded-xl px-8 text-lg font-bold": size === "xl",
            "h-10 w-10 p-0": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

