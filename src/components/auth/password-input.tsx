"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({
  className,
  autoComplete,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Nascondi password" : "Mostra password";

  return (
    <div className="relative">
      <input
        {...props}
        autoComplete={autoComplete}
        type={visible ? "text" : "password"}
        className={cn(
          "w-full rounded-[18px] border border-[var(--app-border)] bg-white/[0.03] px-4 py-3 pr-12 text-base text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)] focus:bg-white/[0.045] focus:shadow-[0_0_0_4px_rgba(208,216,43,0.08)]",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-2 my-auto flex h-10 w-10 items-center justify-center rounded-full text-[var(--app-muted-2)] transition hover:bg-white/[0.06] hover:text-[var(--app-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(12,15,16)]"
        aria-label={label}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[22px] w-[22px]"
      aria-hidden="true"
    >
      <path
        d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[22px] w-[22px]"
      aria-hidden="true"
    >
      <path
        d="M10.733 5.08A9.956 9.956 0 0 1 12 5c4.477 0 8.268 2.943 9.542 7a10.523 10.523 0 0 1-4.104 5.348"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.228 6.228A10.522 10.522 0 0 0 2.458 12c1.274 4.057 5.065 7 9.542 7a9.96 9.96 0 0 0 5.772-1.77"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.88 9.88 4.24 4.24"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.586 6.586A5 5 0 0 1 17 13.414"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.414 17.414A5 5 0 0 1 7 10.586"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
