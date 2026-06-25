import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { ChangeGoalCard } from "@/components/change-goal-card";
import { AppCard } from "@/components/ui/app-card";
import { AppPage } from "@/components/ui/app-page";
import { ProgressBar } from "@/components/ui/progress-bar";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getFlexibleWorkoutState,
  getWeekEnd,
  getWeekStart,
  getWorkoutScheduleForProgram,
} from "@/lib/workout-schedule";
import { buildNormalizedOnboardingProfile } from "@/lib/training-engine/onboarding-profile";
import {
  getCurrentBlockWeek,
  getTrainingBlockDurationWeeks,
} from "@/lib/training-engine/program-block";
import {
  sanitizeUserFacingNotes,
  sanitizeUserFacingText,
} from "@/lib/user-facing-copy";
import { CreateDemoProgramButton } from "./create-demo-program-button";
import { ProgramNotesToggle } from "./program-notes-toggle";
import { ProgramWorkoutCard, type ProgramWorkoutCardStatus } from "./program-workout-card";

export const dynamic = "force-dynamic";

const CURRENT_TRAINING_ENGINE_SOURCE = "rules_v2";

type WorkoutState = ReturnType<typeof getFlexibleWorkoutState>["state"];

type ProgramWorkoutWithRelations = {
  id: number;
  title: string;
  dayLabel: string | null;
  focus: string | null;
  notes: string | null;
  sortOrder: number;
  estimatedMinutes: number | null;
  workoutLogs: Array<{
    id: number;
    status: string;
    performedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    updatedAt: Date;
  }>;
  exercises: Array<{
    id: number;
    name: string;
    sets: number | null;
    reps: string | null;
    restSeconds: number | null;
    intensity: string | null;
    notes: string | null;
    exercise: unknown;
  }>;
};

function formatRest(restSeconds: number | null) {
  if (restSeconds === null) {
    return "Recupero non indicato";
  }

  if (restSeconds === 0) {
    return "0 sec";
  }

  return `${restSeconds} sec`;
}

function formatExercisePrescription(sets: number | null, reps: string | null) {
  const setsLabel = sets ? `${sets}` : "Serie non indicate";
  const repsLabel = reps ?? "ripetizioni non indicate";

  if (!sets) {
    return reps ? reps : "Dettagli non indicati";
  }

  return `${setsLabel} x ${repsLabel}`;
}

function getSingleSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatItalianDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatShortDayLabel(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return `${trimmed.slice(0, 3).charAt(0).toUpperCase()}${trimmed.slice(1, 3)}`;
}

function formatShortDayFromDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    timeZone: "Europe/Rome",
  })
    .format(date)
    .replace(".", "")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getFallbackDurationWeeks(goal: string | null) {
  const normalizedGoal = (goal ?? "").toLowerCase();

  if (
    normalizedGoal.includes("perdita") ||
    normalizedGoal.includes("wellness") ||
    normalizedGoal.includes("benessere")
  ) {
    return 4;
  }

  return getTrainingBlockDurationWeeks("unknown");
}

function getProgramStartedAt(program: {
  startedAt: Date | null;
  startDate: Date | null;
  createdAt: Date;
}) {
  return program.startedAt ?? program.startDate ?? program.createdAt;
}

function getProgramDurationWeeks(program: {
  durationWeeks: number | null;
  goal: string | null;
}) {
  return program.durationWeeks ?? getFallbackDurationWeeks(program.goal);
}

function getWorkoutPriority(state: WorkoutState) {
  switch (state) {
    case "in_progress":
      return 0;
    case "recommended_today":
      return 1;
    case "overdue":
      return 2;
    case "skipped":
      return 3;
    case "future_available":
      return 4;
    case "completed":
    default:
      return 5;
  }
}

function getProgramTitle(program: { goal: string | null; title: string }) {
  const goalLabel = sanitizeUserFacingText(program.goal);

  if (goalLabel) {
    return goalLabel;
  }

  const cleanTitle = sanitizeUserFacingText(program.title);

  if (!cleanTitle) {
    return "Programma personalizzato";
  }

  return cleanTitle.replace(/^Programma\s+/i, "").trim() || cleanTitle;
}

function getProgramObjective(program: { goal: string | null; title: string }) {
  return sanitizeUserFacingText(program.goal) ?? getProgramTitle(program);
}

function getWorkoutCardCopy(
  state: WorkoutState,
): {
  status: ProgramWorkoutCardStatus;
  statusLabel: string;
  recommendedBadgeLabel: string;
  showSkipAction: boolean;
  showKeepSkippedAction: boolean;
} {
  switch (state) {
    case "recommended_today":
      return {
        status: "todo",
        statusLabel: "Da fare",
        recommendedBadgeLabel: "OGGI · CONSIGLIATA",
        showSkipAction: true,
        showKeepSkippedAction: false,
      };
    case "overdue":
      return {
        status: "todo",
        statusLabel: "Da fare",
        recommendedBadgeLabel: "DA RECUPERARE",
        showSkipAction: true,
        showKeepSkippedAction: false,
      };
    case "future_available":
      return {
        status: "todo",
        statusLabel: "Da fare",
        recommendedBadgeLabel: "PROSSIMA SEDUTA",
        showSkipAction: true,
        showKeepSkippedAction: false,
      };
    case "in_progress":
      return {
        status: "in_progress",
        statusLabel: "In corso",
        recommendedBadgeLabel: "OGGI · CONSIGLIATA",
        showSkipAction: false,
        showKeepSkippedAction: false,
      };
    case "skipped":
      return {
        status: "skipped",
        statusLabel: "Saltata",
        recommendedBadgeLabel: "DA RECUPERARE",
        showSkipAction: false,
        showKeepSkippedAction: true,
      };
    case "completed":
    default:
      return {
        status: "completed",
        statusLabel: "Completata",
        recommendedBadgeLabel: "COMPLETATA",
        showSkipAction: false,
        showKeepSkippedAction: false,
      };
  }
}

function extractDistributionFromNotes(notes: string | null) {
  if (!notes) {
    return null;
  }

  const match = notes.match(/Distribuzione settimanale:\s*([^\n.]+)/i);
  return match?.[1]?.trim() ?? null;
}

function inferDistributionFromWorkouts(workouts: ProgramWorkoutWithRelations[]) {
  const signals = workouts
    .flatMap((workout) => [workout.title, workout.dayLabel, workout.focus, workout.notes])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (signals.includes("upper") && signals.includes("lower")) {
    return "Upper / Lower";
  }

  if (
    signals.includes("push") &&
    signals.includes("pull") &&
    (signals.includes("legs") || signals.includes("gambe"))
  ) {
    return "Spinta / Tirata / Gambe";
  }

  if (
    signals.includes("full body") ||
    signals.includes("full_body") ||
    signals.includes("total body")
  ) {
    return "Total body";
  }

  return null;
}

function getDistributionLabel(
  notes: string | null,
  workouts: ProgramWorkoutWithRelations[],
) {
  const fromNotes = extractDistributionFromNotes(notes);

  if (fromNotes) {
    return sanitizeUserFacingText(fromNotes) ?? "Distribuzione personalizzata";
  }

  const fromWorkouts = inferDistributionFromWorkouts(workouts);

  if (fromWorkouts) {
    return fromWorkouts;
  }

  const dayLabels = workouts
    .map((workout) => sanitizeUserFacingText(workout.dayLabel))
    .filter((value): value is string => Boolean(value));

  if (dayLabels.length >= 2) {
    return dayLabels.slice(0, 3).join(" / ");
  }

  return "Distribuzione personalizzata";
}

function getPreviousWeekEntries(
  workouts: ProgramWorkoutWithRelations[],
  start: Date,
  end: Date,
) {
  return workouts
    .flatMap((workout) => {
      const log = workout.workoutLogs.find(
        (entry) =>
          entry.performedAt >= start &&
          entry.performedAt <= end &&
          (entry.status === "completed" || entry.status === "skipped"),
      );

      if (!log) {
        return [];
      }

      return [
        {
          id: `${workout.id}-${log.id}`,
          title: workout.title,
          focus:
            sanitizeUserFacingText(workout.focus) ??
            sanitizeUserFacingNotes(workout.notes) ??
            "Seduta del programma",
          statusLabel: log.status === "completed" ? "Completata" : "Saltata",
          dayLabel: formatShortDayFromDate(log.performedAt),
          performedAt: log.performedAt,
        },
      ];
    })
    .sort((left, right) => right.performedAt.getTime() - left.performedAt.getTime())
    .slice(0, 3);
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--app-muted-2)]">
        {label}
      </p>
      <p className="min-w-0 text-[15px] font-semibold leading-5 tracking-[-0.02em] text-[var(--app-text)] [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function CompactUpdateCard({
  label,
  title,
  body,
  actionLabel,
}: {
  label: string;
  title: string;
  body: string;
  actionLabel: string;
}) {
  return (
    <AppCard
      soft
      className="rounded-[22px] border-white/8 bg-[var(--app-surface)] px-4 py-3.5 shadow-none"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
        {title}
      </p>
      <p className="mt-1.5 text-[13px] leading-5 text-[var(--app-muted)]">{body}</p>
      <div className="mt-3">
        <CreateDemoProgramButton label={actionLabel} />
      </div>
    </AppCard>
  );
}

export type ProgramPageProps = {
  searchParams?: Promise<{
    created?: string | string[];
    t?: string | string[];
  }>;
};

export default async function ProgramPage(props: ProgramPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const searchParams = (await props.searchParams) ?? {};
  const created = getSingleSearchParam(searchParams.created) === "1";
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const currentWeekEnd = getWeekEnd(now);
  const previousWeekReference = new Date(now);
  previousWeekReference.setDate(previousWeekReference.getDate() - 7);
  const previousWeekStart = getWeekStart(previousWeekReference);
  const previousWeekEnd = getWeekEnd(previousWeekReference);

  const [onboardingAnswers, activeProgram] = await Promise.all([
    prisma.onboardingAnswer.findMany({
      where: {
        userId: user.id,
      },
      select: {
        answersJson: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.trainingProgram.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
      include: {
        workouts: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            workoutLogs: {
              where: {
                userId: user.id,
              },
              orderBy: {
                updatedAt: "desc",
              },
              select: {
                id: true,
                status: true,
                performedAt: true,
                startedAt: true,
                completedAt: true,
                updatedAt: true,
              },
            },
            exercises: {
              where: {
                isActive: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
              include: {
                exercise: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const { profile, snapshotHash } = buildNormalizedOnboardingProfile(
    onboardingAnswers.map((answer) => answer.answersJson),
  );
  const latestOnboardingUpdate = onboardingAnswers[0]?.updatedAt ?? null;
  const onboardingChangedSinceProgram = activeProgram
    ? activeProgram.onboardingSnapshotHash
      ? activeProgram.onboardingSnapshotHash !== snapshotHash
      : latestOnboardingUpdate !== null &&
        latestOnboardingUpdate > activeProgram.updatedAt
    : false;
  const engineUpdateAvailable = activeProgram
    ? activeProgram.source !== CURRENT_TRAINING_ENGINE_SOURCE
    : false;
  const sanitizedProgramNotes = sanitizeUserFacingNotes(activeProgram?.notes);
  const activeWorkouts =
    activeProgram?.workouts.filter((workout) => workout.exercises.length > 0) ?? [];
  const schedule = getWorkoutScheduleForProgram(activeWorkouts, now).map((entry) => {
    const currentWeekLog =
      entry.workout.workoutLogs.find(
        (workoutLog) =>
          workoutLog.performedAt >= currentWeekStart &&
          workoutLog.performedAt <= currentWeekEnd,
      ) ?? null;
    const latestWorkoutLog = entry.workout.workoutLogs[0] ?? null;
    const state = getFlexibleWorkoutState({
      plannedDateThisWeek: entry.plannedDateThisWeek,
      plannedDateLabel: entry.plannedDateLabel,
      weekLog: currentWeekLog,
      referenceDate: now,
    });

    return {
      ...entry,
      currentWeekLog,
      latestWorkoutLog,
      state,
    };
  });

  const nextWorkout = schedule
    .filter((entry) => entry.state.state !== "completed")
    .sort((left, right) => {
      const priorityDiff =
        getWorkoutPriority(left.state.state) - getWorkoutPriority(right.state.state);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return left.workout.sortOrder - right.workout.sortOrder;
    })[0];
  const completedSessions = schedule.filter(
    (entry) => entry.state.state === "completed",
  ).length;
  const weeklySessions = activeWorkouts.length;
  const programDurationWeeks = activeProgram
    ? getProgramDurationWeeks(activeProgram)
    : null;
  const currentProgramWeek =
    activeProgram && programDurationWeeks !== null
      ? getCurrentBlockWeek(getProgramStartedAt(activeProgram), programDurationWeeks)
      : null;
  const stripProgressValue =
    activeProgram && programDurationWeeks && currentProgramWeek
      ? Math.round((currentProgramWeek / programDurationWeeks) * 100)
      : weeklySessions > 0
        ? Math.round((completedSessions / weeklySessions) * 100)
        : 0;
  const highlightedWorkoutId = nextWorkout?.workout.id ?? null;
  const weeklyEntries = [...schedule].sort((left, right) => {
    if (left.workout.id === highlightedWorkoutId) {
      return -1;
    }

    if (right.workout.id === highlightedWorkoutId) {
      return 1;
    }

    return left.workout.sortOrder - right.workout.sortOrder;
  });
  const previousWeekEntries = getPreviousWeekEntries(
    activeWorkouts,
    previousWeekStart,
    previousWeekEnd,
  );

  return (
    <AppPage contentClassName="pb-4">
      <div className="space-y-4 pt-[62px]">
        <header className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-muted-2)]">
            IL TUO PROGRAMMA
          </p>
          <h1 className="max-w-[12ch] text-[32px] font-bold leading-[0.98] tracking-[-0.04em] text-[var(--app-text)]">
            {activeProgram ? getProgramTitle(activeProgram) : "Crea il tuo programma"}
          </h1>
        </header>

        {created ? (
          <AppCard
            soft
            className="rounded-[22px] border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] px-4 py-3.5 shadow-none"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-primary)]">
              PROGRAMMA AGGIORNATO
            </p>
            <p className="mt-1.5 text-[13px] leading-5 text-[var(--app-text)]">
              Le sedute disponibili sono state aggiornate correttamente.
            </p>
          </AppCard>
        ) : null}

        {activeProgram ? (
          <>
            <AppCard
              soft
              className="rounded-[24px] border-white/8 bg-[linear-gradient(165deg,rgba(22,25,27,0.96)_0%,rgba(16,19,20,0.98)_100%)] px-4 py-4 shadow-none"
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <SummaryMetric
                  label="Obiettivo"
                  value={getProgramObjective(activeProgram)}
                />
                <SummaryMetric
                  label="Frequenza"
                  value={`${profile.daysPerWeek ?? weeklySessions} / settimana`}
                />
                <SummaryMetric
                  label="Durata"
                  value={
                    programDurationWeeks
                      ? `${programDurationWeeks} settimane`
                      : "Durata da definire"
                  }
                />
                <SummaryMetric
                  label="Split"
                  value={getDistributionLabel(sanitizedProgramNotes, activeWorkouts)}
                />
              </div>

              <div className="mt-4 border-t border-white/8 pt-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-medium text-[var(--app-muted)]">
                    Avanzamento
                  </p>
                  <p className="text-right text-[13px] font-semibold text-[var(--app-primary)]">
                    {programDurationWeeks && currentProgramWeek
                      ? `Settimana ${currentProgramWeek} / ${programDurationWeeks}`
                      : `${completedSessions} / ${weeklySessions} sedute`}
                  </p>
                </div>
                <ProgressBar value={stripProgressValue} className="mt-3 h-[5px]" />
              </div>
            </AppCard>

            <ChangeGoalCard body="Aggiorna il tuo obiettivo e adatta il programma alla tua nuova direzione." />

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-muted-2)]">
                    QUESTA SETTIMANA
                  </p>
                </div>
                {weeklySessions > 0 ? (
                  <p className="text-[12px] font-semibold text-[var(--app-muted-2)]">
                    {completedSessions}/{weeklySessions}
                  </p>
                ) : null}
              </div>

              {weeklyEntries.length > 0 ? (
                <div className="space-y-2.5">
                  {weeklyEntries.map(({ workout, plannedDateLabel, latestWorkoutLog, state }) => {
                    const copy = getWorkoutCardCopy(state.state);

                    return (
                      <ProgramWorkoutCard
                        key={workout.id}
                        workoutId={workout.id}
                        dayLabel={formatShortDayLabel(plannedDateLabel)}
                        title={workout.title}
                        focus={
                          sanitizeUserFacingText(workout.focus) ??
                          sanitizeUserFacingNotes(workout.notes) ??
                          "Seduta del programma"
                        }
                        status={copy.status}
                        statusLabel={copy.statusLabel}
                        ctaHref={`/workouts/${workout.id}`}
                        estimatedMinutes={workout.estimatedMinutes ?? profile.sessionMinutes ?? null}
                        exerciseCount={workout.exercises.length}
                        lastSessionLabel={
                          latestWorkoutLog
                            ? `Ultima seduta ${formatItalianDate(latestWorkoutLog.performedAt)}`
                            : null
                        }
                        showSkipAction={copy.showSkipAction}
                        showKeepSkippedAction={copy.showKeepSkippedAction}
                        exercises={workout.exercises.map((exercise) => ({
                          id: exercise.id,
                          name: exercise.name,
                          prescription: formatExercisePrescription(
                            exercise.sets,
                            exercise.reps,
                          ),
                          rest: formatRest(exercise.restSeconds),
                          intensity: exercise.intensity ?? "Intensita libera",
                          notes: sanitizeUserFacingText(exercise.notes),
                        }))}
                        variant={
                          workout.id === highlightedWorkoutId ? "recommended" : "default"
                        }
                        recommendedBadgeLabel={copy.recommendedBadgeLabel}
                      />
                    );
                  })}
                </div>
              ) : (
                <AppCard
                  soft
                  className="rounded-[22px] border-white/8 bg-[var(--app-surface)] px-4 py-3.5 shadow-none"
                >
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                    Nessuna seduta disponibile
                  </p>
                  <p className="mt-1.5 text-[13px] leading-5 text-[var(--app-muted)]">
                    Riprova tra poco o torna alla dashboard.
                  </p>
                </AppCard>
              )}
            </section>

            {previousWeekEntries.length > 0 ? (
              <section className="space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-muted-2)]">
                  SETTIMANA SCORSA
                </p>
                <div className="space-y-2">
                  {previousWeekEntries.map((entry) => (
                    <AppCard
                      key={entry.id}
                      soft
                      className="rounded-[20px] border-white/8 bg-[var(--app-surface)] px-4 py-3 shadow-none"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                            {entry.title}
                          </p>
                          <p className="mt-1 text-[13px] leading-5 text-[var(--app-muted)]">
                            {entry.focus}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                            {entry.dayLabel}
                          </p>
                          <p className="mt-1 text-[12px] font-semibold text-[var(--app-text)]">
                            {entry.statusLabel}
                          </p>
                        </div>
                      </div>
                    </AppCard>
                  ))}
                </div>
              </section>
            ) : null}

            {sanitizedProgramNotes ? (
              <section>
                <ProgramNotesToggle fullText={sanitizedProgramNotes} />
              </section>
            ) : null}

            {onboardingChangedSinceProgram ? (
              <CompactUpdateCard
                label="PROFILO AGGIORNATO"
                title="Rivedi il programma"
                body="Hai aggiornato le tue informazioni iniziali. Se vuoi, puoi creare una revisione coerente con il profilo piu recente."
                actionLabel="Aggiorna programma"
              />
            ) : null}

            {engineUpdateAvailable ? (
              <CompactUpdateCard
                label="REVISIONE DISPONIBILE"
                title="Crea una nuova revisione"
                body="Puoi generare una revisione del percorso in base al tuo profilo attuale. Le sedute gia svolte restano nello storico."
                actionLabel="Crea revisione"
              />
            ) : null}
          </>
        ) : (
          <AppCard className="rounded-[24px] px-5 py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-primary)]">
              IL TUO PROGRAMMA
            </p>
            <h2 className="mt-3 text-[28px] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--app-text)]">
              Crea il tuo programma
            </h2>
            <p className="mt-2 max-w-[28ch] text-[14px] leading-6 text-[var(--app-muted)]">
              Completa il questionario per ricevere un percorso adatto al tuo obiettivo.
            </p>
            <Link
              href="/onboarding"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--app-primary-border)] bg-[var(--app-primary)] px-5 py-2.5 text-[14px] font-semibold text-black transition hover:brightness-105"
            >
              Completa questionario
            </Link>
          </AppCard>
        )}
      </div>

      <AppBottomNav />
    </AppPage>
  );
}
