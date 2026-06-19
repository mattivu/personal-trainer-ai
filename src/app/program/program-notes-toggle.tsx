"use client";

import { useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { sanitizeUserFacingNotes } from "@/lib/user-facing-copy";

type ProgramNotesToggleProps = {
  fullText: string;
};

function getPreview(text: string, maxLength = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function ProgramNotesToggle({ fullText }: ProgramNotesToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sanitizedText = sanitizeUserFacingNotes(fullText);

  if (!sanitizedText) {
    return null;
  }

  return (
    <AppCard
      soft
      className="rounded-[22px] border-white/8 bg-[var(--app-surface)] px-4 py-3.5 shadow-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
            Indicazioni del programma
          </p>
          <p className="mt-1.5 text-[13px] leading-5 text-[var(--app-muted)]">
            {isOpen ? sanitizedText : getPreview(sanitizedText)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[var(--app-text)] transition hover:border-white/16"
          aria-expanded={isOpen}
        >
          {isOpen ? "Chiudi" : "Apri"}
        </button>
      </div>
    </AppCard>
  );
}
