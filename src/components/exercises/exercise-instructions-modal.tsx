"use client";

import { useEffect, useId, useState } from "react";

type ExerciseInstructionsModalProps = {
  name: string;
  imageUrls: string[];
  instructions: string | null;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
  difficulty: string | null;
  needsTranslation: boolean;
};

function formatDifficulty(value: string | null) {
  if (!value) {
    return null;
  }

  switch (value.toLowerCase()) {
    case "beginner":
      return "Base";
    case "intermediate":
      return "Intermedia";
    case "advanced":
      return "Avanzata";
    default:
      return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  }
}

function splitInstructions(value: string | null) {
  const normalized = (value ?? "").replace(/\r/g, "").trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map((line) => line.replace(/^[-*•]\s*/, ""));
  }

  const segments = normalized
    .split(/(?:(?<=\.)\s+(?=\d+\.)|(?<=\.)\s+(?=[A-ZÀ-ÖØ-Ý]))|(?<=;)\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.length > 1 ? segments : [normalized];
}

export function ExerciseInstructionsModal({
  name,
  imageUrls,
  instructions,
  primaryMuscle,
  secondaryMuscles,
  equipment,
  difficulty,
  needsTranslation,
}: ExerciseInstructionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const instructionItems = splitInstructions(instructions);
  const difficultyLabel = formatDifficulty(difficulty);
  const hasAnyDetails =
    imageUrls.length > 0 ||
    instructionItems.length > 0 ||
    Boolean(primaryMuscle) ||
    secondaryMuscles.length > 0 ||
    Boolean(equipment) ||
    Boolean(difficultyLabel);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!hasAnyDetails) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100"
      >
        Come si fa
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-neutral-800 bg-neutral-950 p-5 text-white sm:rounded-3xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                  Guida esercizio
                </p>
                <h3 id={titleId} className="mt-2 text-2xl font-semibold">
                  {name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-5">
              {imageUrls.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {imageUrls.slice(0, 2).map((imageUrl, index) => (
                    <img
                      key={`${name}-${imageUrl}`}
                      src={imageUrl}
                      alt={`Esecuzione esercizio: ${name}`}
                      className="h-56 w-full rounded-2xl border border-neutral-800 object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
                  Immagini non disponibili per questo esercizio.
                </p>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <p className="text-sm text-neutral-500">Muscoli principali</p>
                <p className="mt-2 text-sm text-neutral-100">
                  {primaryMuscle ?? "Non indicati"}
                </p>
              </div>
              {secondaryMuscles.length > 0 ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-sm text-neutral-500">Muscoli secondari</p>
                  <p className="mt-2 text-sm text-neutral-100">
                    {secondaryMuscles.join(", ")}
                  </p>
                </div>
              ) : null}
              {equipment ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-sm text-neutral-500">Attrezzatura richiesta</p>
                  <p className="mt-2 text-sm text-neutral-100">{equipment}</p>
                </div>
              ) : null}
              {difficultyLabel ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-sm text-neutral-500">Difficoltà</p>
                  <p className="mt-2 text-sm text-neutral-100">{difficultyLabel}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-sm text-neutral-500">Istruzioni</p>
              {instructionItems.length > 0 ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-100">
                  {instructionItems.map((item, index) => (
                    <li key={`${name}-instruction-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-300">
                  Istruzioni non disponibili per questo esercizio.
                </p>
              )}
              {needsTranslation ? (
                <p className="mt-3 text-xs text-amber-200">
                  Istruzioni originali da revisionare.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
