"use client";

import { useEffect, useId, useState } from "react";
import { getExerciseDisplayData } from "@/lib/exercises/exercise-display";

type ExerciseInstructionsModalProps = {
  name: string;
  imageUrls: string[];
  instructions: string | string[] | null;
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
                  {displayData.name}
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
                      key={`${displayData.name}-${imageUrl}`}
                      src={imageUrl}
                      alt={`Esecuzione esercizio: ${displayData.name}`}
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
                  {displayData.primaryMuscles.join(", ") || "Non indicati"}
                </p>
              </div>
              {displayData.secondaryMuscles.length > 0 ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-sm text-neutral-500">Muscoli secondari</p>
                  <p className="mt-2 text-sm text-neutral-100">
                    {displayData.secondaryMuscles.join(", ")}
                  </p>
                </div>
              ) : null}
              {displayData.equipment.length > 0 ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-sm text-neutral-500">Attrezzatura richiesta</p>
                  <p className="mt-2 text-sm text-neutral-100">
                    {displayData.equipment.join(", ")}
                  </p>
                </div>
              ) : null}
              {displayData.difficulty ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-sm text-neutral-500">Difficoltà</p>
                  <p className="mt-2 text-sm text-neutral-100">{displayData.difficulty}</p>
                </div>
              ) : null}
              {displayData.category ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <p className="text-sm text-neutral-500">Categoria</p>
                  <p className="mt-2 text-sm text-neutral-100">{displayData.category}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-sm text-neutral-500">Istruzioni</p>
              {displayData.instructions.length > 0 ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-100">
                  {displayData.instructions.map((item, index) => (
                    <li key={`${displayData.name}-instruction-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-300">
                  Istruzioni non disponibili per questo esercizio.
                </p>
              )}
              {displayData.needsTranslationReview ? (
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
