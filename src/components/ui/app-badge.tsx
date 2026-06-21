import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

type AppBadgeTone = "neutral" | "accent" | "success" | "warning";

const toneClasses: Record<AppBadgeTone, string> = {
  neutral:
    "border border-[var(--app-border)] bg-white/[0.05] text-white/70",
  accent:
    "border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
  success:
    "border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
  warning: "border border-amber-500/20 bg-amber-500/10 text-amber-200",
};

type AppBadgeProps = ComponentPropsWithoutRef<"span"> & {
  tone?: AppBadgeTone;
};

export function AppBadge({
  className,
  tone = "neutral",
  ...props
}: AppBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
