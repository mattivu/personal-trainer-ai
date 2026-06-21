import { cn } from "./cn";

type ProgressBarProps = {
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-[6px] overflow-hidden rounded-full bg-white/8", className)}>
      <div
        className="h-full rounded-full bg-[var(--app-primary)] transition-[width]"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
