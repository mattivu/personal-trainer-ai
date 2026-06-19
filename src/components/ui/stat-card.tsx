import type { ReactNode } from "react";
import { cn } from "./cn";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  accent = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4",
        className
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-muted-2)]">
        {label}
      </p>
      <p
        className={cn(
          "font-metrics mt-3 text-[28px] font-semibold tracking-[-0.03em] text-[var(--app-text)]",
          accent && "text-[var(--app-primary)]"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-[var(--app-muted)]">{hint}</p> : null}
    </div>
  );
}
