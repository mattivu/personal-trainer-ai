"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { AppCard } from "@/components/ui/app-card";
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

export type ProgramWorkoutCardStatus =
  | "todo"
  | "in_progress"
  | "completed"
  | "skipped";

type ProgramWorkoutCardProps = {
  workoutId: number;
  dayLabel: string;
  title: string;
  focus: string;
  status: ProgramWorkoutCardStatus;
  statusLabel: string;
  ctaHref: string;
  estimatedMinutes: number | null;
  exerciseCount: number;
  lastSessionLabel: string | null;
  showSkipAction: boolean;
  showKeepSkippedAction?: boolean;
  exercises: WorkoutExerciseItem[];
  variant?: "recommended" | "default";
  recommendedBadgeLabel?: string;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricText({ children }: { children: ReactNode }) {
  return <span className="font-metrics">{children}</span>;
}

function getStatusClasses(status: ProgramWorkoutCardStatus) {
  switch (status) {
    case "completed":
      return "border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]";
    case "in_progress":
      return "border-white/12 bg-white/[0.055] text-[var(--app-text)]";
    case "skipped":
      return "border-white/8 bg-white/[0.03] text-white/50";
    case "todo":
    default:
      return "border-white/8 bg-white/[0.035] text-white/72";
  }
}

function getSummaryLine(
  focus: string,
  estimatedMinutes: number | null,
  exerciseCount: number,
) {
  if (estimatedMinutes) {
    return `${focus} · ${estimatedMinutes} min`;
  }

  return `${focus} · ${exerciseCount} ${exerciseCount === 1 ? "esercizio" : "esercizi"}`;
}

export function ProgramWorkoutCard({
  workoutId,
  dayLabel,
  title,
  focus,
  status,
  statusLabel,
  ctaHref,
  estimatedMinutes,
  exerciseCount,
  lastSessionLabel,
  showSkipAction,
  showKeepSkippedAction = false,
  exercises,
  variant = "default",
  recommendedBadgeLabel = "OGGI · CONSIGLIATA",
}: ProgramWorkoutCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isRecommendedCard = variant === "recommended";

  return (
    <AppCard
      soft
      style={{
        borderColor: isRecommendedCard ? "#D0D82B" : undefined,
        boxShadow: isRecommendedCard
          ? "0 0 0 1px rgba(208, 216, 43, 0.18), 0 20px 60px rgba(208, 216, 43, 0.08)"
          : undefined,
      }}
      className={[
        "border",
        "shadow-none",
        "border-white/8",
        isRecommendedCard
          ? "rounded-[24px] bg-[var(--app-surface)] px-4 py-4 shadow-[0_0_0_1px_rgba(208,216,43,0.06)]"
          : "rounded-[22px] bg-[var(--app-surface)] px-4 py-3.5",
      ].join(" ")}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          {isRecommendedCard ? (
            <span className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-primary)]">
              {recommendedBadgeLabel}
            </span>
          ) : (
            <span
              className={`inline-flex min-h-[28px] items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${getStatusClasses(status)}`}
            >
              {statusLabel}
            </span>
          )}
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
            {dayLabel}
          </p>
        </div>

        <div className="space-y-1">
          <Link href={ctaHref} className="block">
            <h3
              className={
                isRecommendedCard
                  ? "text-[19px] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--app-text)]"
                  : "text-[16px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--app-text)]"
              }
            >
              {title}
            </h3>
          </Link>
          <p
            className={
              isRecommendedCard
                ? "text-[14px] leading-6 text-[var(--app-muted)]"
                : "text-[13px] leading-5 text-[var(--app-muted)]"
            }
          >
            {isRecommendedCard
              ? getSummaryLine(focus, estimatedMinutes, exerciseCount)
              : `${focus} · ${dayLabel}`}
          </p>
          {!isRecommendedCard && lastSessionLabel ? (
            <p className="text-[12px] leading-5 text-[var(--app-muted-2)]">
              {lastSessionLabel}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            aria-expanded={isOpen}
          >
            {isOpen ? "Nascondi dettagli" : "Dettagli"}
            <ChevronIcon open={isOpen} />
          </button>

          <Link
            href={ctaHref}
            className={[
              "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold transition",
              isRecommendedCard
                ? "border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-primary)] hover:brightness-110"
                : "border border-white/10 bg-white/[0.035] text-[var(--app-text)] hover:border-white/16 hover:bg-white/[0.05]",
            ].join(" ")}
          >
            Apri
            <ArrowIcon />
          </Link>
        </div>

        {isOpen ? (
          <div className="space-y-3 border-t border-white/8 pt-3">
            {isRecommendedCard ? (
              <div className="flex flex-wrap gap-2 text-[12px] text-[var(--app-muted)]">
                {estimatedMinutes ? (
                  <span className="app-pill">
                    <MetricText>~{estimatedMinutes}</MetricText> min
                  </span>
                ) : null}
                <span className="app-pill">
                  <MetricText>{exerciseCount}</MetricText>{" "}
                  {exerciseCount === 1 ? "esercizio" : "esercizi"}
                </span>
              </div>
            ) : null}

            {showSkipAction || showKeepSkippedAction ? (
              <div className="flex flex-wrap gap-2">
                {showSkipAction ? <SkipWorkoutButton workoutId={workoutId} /> : null}
                {showKeepSkippedAction ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-10 items-center justify-center rounded-[16px] border border-white/8 px-4 py-2 text-[13px] font-semibold text-white/45"
                  >
                    Mantieni stato attuale
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              {exercises.map((exercise) => (
                <article
                  key={exercise.id}
                  className="rounded-[18px] border border-white/7 bg-[var(--app-bg)]/60 px-3.5 py-3"
                >
                  <h4 className="text-[14px] font-semibold text-[var(--app-text)]">
                    {getExerciseDisplayName(exercise)}
                  </h4>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--app-muted)]">
                    {exercise.prescription} · Recupero {exercise.rest}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--app-muted-2)]">
                    Intensita {exercise.intensity}
                  </p>
                  {exercise.notes ? (
                    <p className="mt-2 text-[12px] leading-5 text-[var(--app-muted)]">
                      {exercise.notes}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AppCard>
  );
}
