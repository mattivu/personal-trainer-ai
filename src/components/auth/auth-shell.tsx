import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { AppCard } from "@/components/ui/app-card";
import { cn } from "@/components/ui/cn";

type AuthShellProps = {
  title: string;
  subtitle: string;
  footerPrompt: string;
  footerHref: string;
  footerLabel: string;
  children: ReactNode;
  error?: string | null;
};

export function AuthShell({
  title,
  subtitle,
  footerPrompt,
  footerHref,
  footerLabel,
  children,
  error,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-[var(--app-text)] sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(208,216,43,0.15),_transparent_58%)]"
      />

      <div className="relative mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[var(--app-shell-outer-width)] items-center justify-center">
        <div className="w-full max-w-[var(--app-shell-width)] space-y-5">
          <header className="space-y-3 px-1">
            <div className="inline-flex rounded-full border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--app-primary)]">
              Personal Trainer AI
            </div>
            <div className="space-y-1">
              <h1 className="text-[1.95rem] font-bold leading-[1.02] tracking-[-0.04em] text-[var(--app-text)]">
                {title}
              </h1>
              <p className="max-w-[32ch] text-sm leading-6 text-[var(--app-muted)]">
                {subtitle}
              </p>
            </div>
            <p className="text-sm text-[var(--app-muted-2)]">
              Il tuo percorso, sempre con te.
            </p>
          </header>

          <AppCard className="rounded-[28px] border-[color:var(--app-border-strong)] bg-[linear-gradient(180deg,rgba(18,21,22,0.98)_0%,rgba(12,15,16,0.98)_100%)] px-5 py-5 shadow-[0_22px_50px_rgba(0,0,0,0.34)] sm:px-6 sm:py-6">
            <div className="space-y-5">
              {error ? (
                <div className="rounded-[18px] border border-[rgba(255,122,122,0.24)] bg-[rgba(255,122,122,0.08)] px-4 py-3 text-sm text-[var(--app-danger)]">
                  {error}
                </div>
              ) : null}

              {children}

              <p className="text-center text-sm text-[var(--app-muted)]">
                {footerPrompt}{" "}
                <Link
                  href={footerHref}
                  className="font-semibold text-[var(--app-text)] transition hover:text-[var(--app-primary)]"
                >
                  {footerLabel}
                </Link>
              </p>
            </div>
          </AppCard>
        </div>
      </div>
    </main>
  );
}

type AuthFieldProps = {
  label: string;
  children: ReactNode;
};

export function AuthField({ label, children }: AuthFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--app-text)]">{label}</span>
      {children}
    </label>
  );
}

type AuthInputProps = InputHTMLAttributes<HTMLInputElement>;

export function AuthInput({ className, ...props }: AuthInputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-[18px] border border-[var(--app-border)] bg-white/[0.03] px-4 py-3 text-base text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)] focus:bg-white/[0.045] focus:shadow-[0_0_0_4px_rgba(208,216,43,0.08)]",
        className,
      )}
      {...props}
    />
  );
}
