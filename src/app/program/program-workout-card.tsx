"use client";

import Link from "next/link";
import { useState } from "react";
import { getExerciseDisplayName } from "@/lib/exercises/exercise-display";
import { SkipWorkoutButton } from "./skip-workout-button";

type WorkoutExerciseItem = {
  id: number;
  name: string;
  prescription: string;
  rest: string;
  intensity: string;
  notes: string | null;
};

type ProgramWorkoutCardProps = {
  workoutId: number;
  plannedDateLabel: string;
  title: string;
  focus: string;
  statusLabel: string;
  statusDescription: string | null;
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: "primary" | "secondary";
  lastSessionLabel: string | null;
  showSkipAction: boolean;
  showKeepSkippedAction?: boolean;
  exercises: WorkoutExerciseItem[];
};

export function ProgramWorkoutCard({
  workoutId,
  plannedDateLabel,
  title,
  focus,
  statusLabel,
  statusDescription,
  ctaLabel,
  ctaHref,
  ctaVariant,
  lastSessionLabel,
  showSkipAction,
  showKeepSkippedAction = false,
  exercises,
}: ProgramWorkoutCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
            Giorno consigliato: {plannedDateLabel}
          </p>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-neutral-300">Focus: {focus}</p>
          <p className="text-sm font-medium text-neutral-100">{statusLabel}</p>
          {statusDescription ? (
            <p className="text-sm text-neutral-400">{statusDescription}</p>
          ) : null}
          {lastSessionLabel ? (
            <p className="text-sm text-neutral-500">{lastSessionLabel}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href={ctaHref}
            className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ${
              ctaVariant === "primary"
                ? "bg-white text-neutral-950"
                : "border border-neutral-700 text-neutral-100"
            }`}
          >
            {ctaLabel}
          </Link>

          {showSkipAction ? <SkipWorkoutButton workoutId={workoutId} /> : null}

          {showKeepSkippedAction ? (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 cursor-default items-center justify-center rounded-xl border border-neutral-800 px-4 py-2.5 text-sm font-semibold text-neutral-500"
            >
              Mantieni saltata
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            aria-expanded={isOpen}
          >
            {isOpen ? "Nascondi esercizi" : "Mostra esercizi"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-4 space-y-3 border-t border-neutral-800 pt-4">
          {exercises.map((exercise) => (
            <article
              key={exercise.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <h4 className="text-sm font-semibold text-white">
                {getExerciseDisplayName(exercise)}
              </h4>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
