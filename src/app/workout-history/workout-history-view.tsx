"use client";

import Link from "next/link";
import { useState } from "react";
import { AiCoachCard } from "@/components/ai-coach-card";
import { NutritionDateControls } from "@/components/nutrition/nutrition-date-controls";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/buttons";
import { cn } from "@/components/ui/cn";

type WorkoutHistoryViewProps = {
  history: HistoryEntry[];
  completedSessions: number;
  consistency: number;
  todayKey: string;
  weeklyReviewHref?: string;
  programHref: string;
};

type HistoryEntry = {
  id: number;
  performedAtIso: string;
  performedAtLabel: string;
  timeLabel: string;
  dayKey: string;
  startedAtIso: string | null;
  completedAtIso: string | null;
  updatedAtIso: string;
  status: string;
  statusLabel: string;
  perceivedEffort: number | null;
  notes: string | null;
  workoutName: string;
  programName: string;
  exerciseCount: number;
  totalSets: number;
  hasFeedback: boolean;
  exercises: HistoryExercise[];
};

type HistoryExercise = {
  programExerciseId: number | null;
  exerciseName: string;
  sets: HistorySet[];
};

type HistorySet = {
  id: number;
  setNumber: number;
  weightKg: number | null;
  actualReps: number | null;
  rir: number | null;
  completed: boolean;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function formatWeight(value: number | null) {
  if (value === null) {
    return "kg n/d";
  }

  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)} kg`;
}

function formatReps(value: number | null) {
  return value === null ? "rip n/d" : `${value} rip`;
}

function formatRir(value: number | null) {
  return value === null ? "RIR n/d" : `RIR ${value}`;
}

function shortenExerciseName(value: string) {
  const compact = value.split(" - ")[0]?.trim() || value.trim();
  if (compact.length <= 18) {
    return compact;
  }

  return `${compact.slice(0, 17)}…`;
}

function getBestComparableSet(sets: HistorySet[]) {
  const comparableSets = sets.filter(
    (set) => set.completed && (set.weightKg !== null || set.actualReps !== null)
  );
  const source = comparableSets.length > 0 ? comparableSets : sets;

  if (source.length === 0) {
    return null;
  }

  return source.reduce<HistorySet | null>((best, set) => {
    if (!best) {
      return set;
    }

    const bestWeight = best.weightKg ?? -1;
    const currentWeight = set.weightKg ?? -1;
    if (currentWeight !== bestWeight) {
      return currentWeight > bestWeight ? set : best;
    }

    const bestReps = best.actualReps ?? -1;
    const currentReps = set.actualReps ?? -1;
    if (currentReps !== bestReps) {
      return currentReps > bestReps ? set : best;
    }

    return set.setNumber < best.setNumber ? set : best;
  }, null);
}

function getProgressBadges(entry: HistoryEntry, history: HistoryEntry[]) {
  const currentIndex = history.findIndex((candidate) => candidate.id === entry.id);
  const previousEntries = currentIndex >= 0 ? history.slice(currentIndex + 1) : [];
  const badges: string[] = [];

  for (const exercise of entry.exercises) {
    if (badges.length >= 2) {
      break;
    }

    const currentBest = getBestComparableSet(exercise.sets);
    if (!currentBest) {
      continue;
    }

    const previousExercise = previousEntries
      .flatMap((previousEntry) => previousEntry.exercises)
      .find((candidate) => candidate.exerciseName === exercise.exerciseName);

    if (!previousExercise) {
      continue;
    }

    const previousBest = getBestComparableSet(previousExercise.sets);
    if (!previousBest) {
      continue;
    }

    const shortName = shortenExerciseName(exercise.exerciseName);

    if (
      currentBest.weightKg !== null &&
      previousBest.weightKg !== null &&
      currentBest.weightKg > previousBest.weightKg
    ) {
      const delta = currentBest.weightKg - previousBest.weightKg;
      badges.push(`${shortName} +${formatNumber(delta)} kg`);
      continue;
    }

    if (
      currentBest.weightKg !== null &&
      previousBest.weightKg !== null &&
      currentBest.weightKg === previousBest.weightKg &&
      currentBest.actualReps !== null &&
      previousBest.actualReps !== null &&
      currentBest.actualReps > previousBest.actualReps
    ) {
      const delta = currentBest.actualReps - previousBest.actualReps;
      badges.push(`${shortName} +${delta} rep`);
      continue;
    }

    if (
      currentBest.weightKg !== null &&
      previousBest.weightKg !== null &&
      currentBest.actualReps !== null &&
      previousBest.actualReps !== null &&
      currentBest.weightKg === previousBest.weightKg &&
      currentBest.actualReps === previousBest.actualReps
    ) {
      badges.push(`${shortName} stabile`);
    }
  }

  if (badges.length > 0) {
    return badges;
  }

  const fallbackBadges = [
    entry.status === "completed" ? "Completata" : entry.statusLabel,
    `${entry.exerciseCount} ${entry.exerciseCount === 1 ? "esercizio" : "esercizi"}`,
    entry.hasFeedback ? "Feedback registrato" : null,
  ].filter((badge): badge is string => Boolean(badge));

  return fallbackBadges.slice(0, 2);
}

function ArrowIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M7.5 5 12.5 10l-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricCard({
  value,
  label,
  valueClassName,
}: {
  value: string;
  label: string;
  valueClassName?: string;
}) {
  return (
    <AppCard className="min-h-[84px] rounded-[24px] border-white/8 bg-[var(--app-surface)] px-4 py-3 shadow-none sm:min-h-[88px]">
      <div className="flex h-full flex-col justify-center">
        <p
          className={cn(
            "font-metrics text-[30px] font-semibold leading-none tracking-[-0.05em] sm:text-[34px]",
            valueClassName
          )}
        >
          {value}
        </p>
        <p className="mt-1.5 text-[13px] font-semibold leading-tight text-[var(--app-text)]">
          {label}
        </p>
      </div>
    </AppCard>
  );
}

function WorkoutSessionCard({
  entry,
  history,
}: {
  entry: HistoryEntry;
  history: HistoryEntry[];
}) {
  const [open, setOpen] = useState(false);
  const badges = getProgressBadges(entry, history);

  return (
    <AppCard className="rounded-[24px] px-4 py-4 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[18px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--app-text)]">
            {entry.workoutName}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--app-muted)]">{entry.programName}</p>
        </div>

        <div className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
          {entry.timeLabel}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge, index) => (
          <span
            key={`${entry.id}-badge-${index}`}
            className={cn(
              "inline-flex min-h-8 items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold",
              index === 0
                ? "border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
                : "border-white/8 bg-white/[0.03] text-[var(--app-text)]"
            )}
          >
            {badge}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[18px] border border-white/7 bg-[var(--app-bg)]/55 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--app-text)]">
            {entry.exerciseCount} {entry.exerciseCount === 1 ? "esercizio" : "esercizi"}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--app-muted)]">
            {entry.totalSets} {entry.totalSets === 1 ? "serie registrata" : "serie registrate"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-2 text-[12px] font-semibold text-[var(--app-text)] transition hover:border-white/14 hover:bg-white/[0.05]"
          aria-expanded={open}
        >
          <span>{open ? "Nascondi dettagli" : "Dettagli seduta"}</span>
          <ArrowIcon open={open} />
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
          {entry.notes ? (
            <div className="rounded-[18px] border border-white/8 bg-[var(--app-surface-soft)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Note
              </p>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-[var(--app-text)]">
                {entry.notes}
              </p>
            </div>
          ) : null}

          {entry.perceivedEffort !== null ? (
            <div className="rounded-[18px] border border-white/8 bg-[var(--app-surface-soft)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Fatica percepita
              </p>
              <p className="mt-2 font-metrics text-[24px] font-semibold tracking-[-0.03em] text-[var(--app-primary)]">
                {entry.perceivedEffort}
              </p>
            </div>
          ) : null}

          {entry.exercises.length === 0 ? (
            <div className="rounded-[18px] border border-white/8 bg-[var(--app-surface-soft)] px-4 py-3.5 text-[14px] text-[var(--app-muted)]">
              Nessun dettaglio disponibile per questa seduta.
            </div>
          ) : (
            <div className="space-y-3">
              {entry.exercises.map((exercise) => (
                <section
                  key={`${entry.id}-${exercise.programExerciseId ?? exercise.exerciseName}`}
                  className="rounded-[18px] border border-white/8 bg-[var(--app-surface-soft)] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-[15px] font-semibold text-[var(--app-text)]">
                      {exercise.exerciseName}
                    </h4>
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                      {exercise.sets.length} {exercise.sets.length === 1 ? "serie" : "serie"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {exercise.sets.map((set) => (
                      <div
                        key={set.id}
                        className="rounded-[14px] border border-white/7 bg-[var(--app-bg)]/55 px-3.5 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[13px] font-semibold text-[var(--app-text)]">
                            Serie {set.setNumber}
                          </p>
                          <span
                            className={cn(
                              "text-[11px] font-semibold uppercase tracking-[0.08em]",
                              set.completed ? "text-[var(--app-primary)]" : "text-[var(--app-muted-2)]"
                            )}
                          >
                            {set.completed ? "Completata" : "Parziale"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-[var(--app-muted)]">
                          <span>{formatWeight(set.weightKg)}</span>
                          <span>{formatReps(set.actualReps)}</span>
                          <span>{formatRir(set.rir)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <AiCoachCard
            mode="post_workout_review"
            workoutLogId={entry.id}
            buttonLabel="Analizza questa seduta"
          />
        </div>
      ) : null}
    </AppCard>
  );
}

export function WorkoutHistoryView({
  history,
  completedSessions,
  consistency,
  todayKey,
  weeklyReviewHref,
  programHref,
}: WorkoutHistoryViewProps) {
  const defaultDayKey = history[0]?.dayKey ?? todayKey;
  const [selectedDayKey, setSelectedDayKey] = useState(defaultDayKey);
  const visibleEntries = history.filter((entry) => entry.dayKey === selectedDayKey);

  return (
    <div className="space-y-4">
      <section>
        <NutritionDateControls
          selectedDate={selectedDayKey}
          maxDate={todayKey}
          onDateChange={setSelectedDayKey}
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MetricCard
          value={formatNumber(completedSessions)}
          label="sedute completate"
          valueClassName="text-[var(--app-primary)]"
        />
        <MetricCard value={`${consistency}%`} label="costanza" valueClassName="text-[var(--app-text)]" />
      </section>

      {weeklyReviewHref ? (
        <Link href={weeklyReviewHref} className="block">
          <AppCard
            soft
            className="rounded-[24px] border-[var(--app-border)] px-5 py-4 shadow-none transition hover:border-white/12 hover:bg-white/[0.05]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Revisione
                </p>
                <p className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                  Revisione settimanale
                </p>
              </div>
              <span className="text-[var(--app-muted-2)]">
                <ChevronIcon />
              </span>
            </div>
          </AppCard>
        </Link>
      ) : (
        <AppCard
          soft
          className="rounded-[24px] border-dashed px-5 py-4 text-[var(--app-muted)] shadow-none"
        >
          Revisione settimanale non disponibile.
        </AppCard>
      )}

      {history.length === 0 ? (
        <AppCard className="rounded-[24px] px-5 py-5 shadow-none">
          <p className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
            Non hai ancora sedute completate.
          </p>
          <p className="mt-2 text-[14px] leading-6 text-[var(--app-muted)]">
            Completa il primo allenamento per vedere qui i tuoi progressi.
          </p>
          <div className="mt-5">
            <PrimaryButton href={programHref}>Apri programma</PrimaryButton>
          </div>
        </AppCard>
      ) : (
        <>
          <section className="pb-2">
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Sedute del giorno
                </p>
              </div>
              <p className="text-[12px] text-[var(--app-muted)]">
                {visibleEntries.length} {visibleEntries.length === 1 ? "seduta" : "sedute"}
              </p>
            </div>

            {visibleEntries.length === 0 ? (
              <AppCard className="rounded-[24px] px-5 py-5 shadow-none">
                <p className="text-[16px] font-semibold text-[var(--app-text)]">
                  Nessuna seduta registrata in questo giorno.
                </p>
                <p className="mt-2 text-[14px] leading-6 text-[var(--app-muted)]">
                  Seleziona un altro giorno oppure continua dal programma per aggiungere nuove
                  sedute allo storico.
                </p>
              </AppCard>
            ) : (
              <div className="space-y-3">
                {visibleEntries.map((entry) => (
                  <WorkoutSessionCard key={entry.id} entry={entry} history={history} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
