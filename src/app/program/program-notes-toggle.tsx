"use client";

import { useState } from "react";

type ProgramNotesToggleProps = {
  fullText: string;
};

export function ProgramNotesToggle({ fullText }: ProgramNotesToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="text-sm font-semibold text-white underline underline-offset-4"
        aria-expanded={isOpen}
      >
        {isOpen
          ? "Nascondi indicazioni"
          : "Mostra indicazioni del programma"}
      </button>

      {isOpen ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-300">
          {fullText}
        </p>
      ) : null}
    </div>
  );
}
