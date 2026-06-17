"use client";

import Link from "next/link";
import { useState } from "react";

type WorkoutExerciseItem = {
  id: number;
  name: string;
  prescription: string;
  rest: string;
  intensity: string;
  notes: string | null;
};

type ProgramWorkoutCardProps = {
  dayLabel: string;
  title: string;
  focus: string;
  statusLabel: string;
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: "primary" | "secondary";
  availabilityLabel: string | null;
  lastSessionLabel: string | null;
  exercises: WorkoutExerciseItem[];
};

export function ProgramWorkoutCard({
  dayLabel,
  title,
  focus,
  statusLabel,
  ctaLabel,
  ctaHref,
  ctaVariant,
  availabilityLabel,
  lastSessionLabel,
  exercises,
}: ProgramWorkoutCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
            {dayLabel}
          </p>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-neutral-300">Focus: {focus}</p>
          <p className="text-sm font-medium text-neutral-100">{statusLabel}</p>
          {availabilityLabel ? (
            <p className="text-sm text-neutral-400">{availabilityLabel}</p>
          ) : null}
          {lastSessionLabel ? (
            <p className="text-sm text-neutral-500">{lastSessionLabel}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-white">
                  {exercise.name}
                </h4>
                <p className="text-sm text-neutral-300">
                  {exercise.prescription}
                </p>
                <p className="text-sm text-neutral-400">
                  Recupero: {exercise.rest}
                </p>
                <p className="text-sm text-neutral-400">
                  Intensita: {exercise.intensity}
                </p>
                {exercise.notes ? (
                  <p className="text-sm text-neutral-400">{exercise.notes}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
