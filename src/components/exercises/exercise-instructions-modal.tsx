"use client";

import { useEffect, useId, useState } from "react";
import { getExerciseDisplayData } from "@/lib/exercises/exercise-display";

type ExerciseInstructionsModalProps = {
  name: string;
  imageUrls: string[];
  instructions: string | string[] | null;
  technicalNote?: string | null;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
  difficulty: string | null;
  category?: string | null;
  needsTranslation: boolean;
};

export function ExerciseInstructionsModal({
  name,
  imageUrls,
  instructions,
  technicalNote,
  primaryMuscle,
  secondaryMuscles,
  equipment,
  difficulty,
  category,
  needsTranslation,
}: ExerciseInstructionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const displayData = getExerciseDisplayData({
    name,
    instructions,
    primaryMuscle,
    secondaryMuscles,
    equipment,
    difficulty,
    category,
    needsTranslation,
  });
  const hasAnyDetails =
    imageUrls.length > 0 ||
    displayData.instructions.length > 0 ||
    Boolean(technicalNote?.trim()) ||
    displayData.primaryMuscles.length > 0 ||
    displayData.secondaryMuscles.length > 0 ||
    displayData.equipment.length > 0 ||
    Boolean(displayData.difficulty) ||
    Boolean(displayData.category);

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
        className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-white/16 hover:bg-white/[0.05]"
      >
        Come si fa
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] border border-white/10 bg-[var(--app-surface)] p-5 text-[var(--app-text)] sm:rounded-[28px] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex justify-center sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Guida esercizio
                </p>
                <h3
                  id={titleId}
                  className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-[var(--app-text)]"
                >
                  {displayData.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:border-white/16 hover:bg-white/[0.05]"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-5">
              {imageUrls.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {imageUrls.slice(0, 2).map((imageUrl, index) => (
                    <img
                      key={`${displayData.name}-${imageUrl}`}
                      src={imageUrl}
                      alt={`Esecuzione esercizio: ${displayData.name}`}
                      className="h-56 w-full rounded-[22px] border border-white/8 object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-[22px] border border-white/8 bg-[var(--app-surface-soft)] px-4 py-3 text-sm text-[var(--app-muted)]">
                  Immagini non disponibili per questo esercizio.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {displayData.equipment.map((item) => (
                <span key={item} className="app-pill">
                  {item}
                </span>
              ))}
              {displayData.difficulty ? (
                <span className="inline-flex min-h-[30px] items-center rounded-full border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--app-primary)]">
                  {displayData.difficulty}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-white/8 bg-[var(--app-surface-soft)] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Muscoli principali
                </p>
                <p className="mt-2 text-sm text-[var(--app-text)]">
                  {displayData.primaryMuscles.join(", ") || "Non indicati"}
                </p>
              </div>
              {displayData.secondaryMuscles.length > 0 ? (
                <div className="rounded-[18px] border border-white/8 bg-[var(--app-surface-soft)] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                    Muscoli secondari
                  </p>
                  <p className="mt-2 text-sm text-[var(--app-text)]">
                    {displayData.secondaryMuscles.join(", ")}
                  </p>
                </div>
              ) : null}
              {displayData.category ? (
                <div className="rounded-[18px] border border-white/8 bg-[var(--app-surface-soft)] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                    Categoria
                  </p>
                  <p className="mt-2 text-sm text-[var(--app-text)]">{displayData.category}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-[var(--app-surface-soft)] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Esecuzione
              </p>
              {displayData.instructions.length > 0 ? (
                <ol className="mt-4 space-y-3">
                  {displayData.instructions.map((item, index) => (
                    <li
                      key={`${displayData.name}-instruction-${index}`}
                      className="flex gap-3"
                    >
                      <span className="font-metrics inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[13px] font-semibold text-[var(--app-primary)]">
                        {index + 1}
                      </span>
                      <span className="text-sm leading-6 text-[var(--app-text)]">{item}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  Istruzioni non disponibili per questo esercizio.
                </p>
              )}
              {displayData.needsTranslationReview ? (
                <p className="mt-3 text-xs text-amber-200">
                  Istruzioni originali da revisionare.
                </p>
              ) : null}
            </div>

            {technicalNote?.trim() ? (
              <div className="mt-5 rounded-[22px] border border-white/8 bg-[var(--app-surface-soft)] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Indicazione tecnica
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--app-text)]">
                  {technicalNote}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="app-primary-button mt-5 w-full"
            >
              Ho capito
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
