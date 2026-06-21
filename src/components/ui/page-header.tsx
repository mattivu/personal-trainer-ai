import type { ReactNode } from "react";
import { cn } from "./cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  meta?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  meta,
}: PageHeaderProps) {
  return (
    <header className={cn("pt-[62px]", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-[var(--app-text)]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-[34rem] text-sm leading-6 text-[var(--app-muted)]">
              {description}
            </p>
          ) : null}
          {meta ? <div className="mt-4">{meta}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
