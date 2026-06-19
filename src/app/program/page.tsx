import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AiCoachCard } from "@/components/ai-coach-card";
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
import { sanitizeUserFacingNotes, sanitizeUserFacingText } from "@/lib/user-facing-copy";
import { CreateDemoProgramButton } from "./create-demo-program-button";
import { ProgramNotesToggle } from "./program-notes-toggle";
import { ProgramWorkoutCard } from "./program-workout-card";

export const dynamic = "force-dynamic";
const CURRENT_TRAINING_ENGINE_SOURCE = "rules_v2";

function formatRest(restSeconds: number | null) {
  if (restSeconds === null) {
    return "Non indicato";
  }

  if (restSeconds === 0) {
    return "0 sec";
  }

  return `${restSeconds} sec`;
}

function formatExercisePrescription(sets: number | null, reps: string | null) {
  const setsLabel = sets ? `${sets}` : "Serie non indicate";
  const repsLabel = reps ?? "reps non indicate";

  if (!sets) {
    return reps ? reps : "Dettagli non indicati";
  }

  return `${setsLabel} x ${repsLabel}`;
}

function getSingleSearchParam(
  value: string | string[] | undefined
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

function formatItalianDateTime(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

function getFlexibleStatusCopy(
  state: ReturnType<typeof getFlexibleWorkoutState>["state"],
  plannedDateLabel: string
) {
  switch (state) {
    case "recommended_today":
      return {
        statusLabel: "Consigliata oggi",
        statusDescription: null,
        ctaLabel: "Inizia seduta",
        ctaVariant: "primary" as const,
        showSkipAction: true,
        showKeepSkippedAction: false,
      };
    case "overdue":
      return {
        statusLabel: "Da recuperare",
        statusDescription: `Questa seduta era prevista per ${plannedDateLabel}.`,
        ctaLabel: "Recupera seduta",
        ctaVariant: "primary" as const,
        showSkipAction: true,
        showKeepSkippedAction: false,
      };
    case "future_available":
      return {
        statusLabel: "Prevista più avanti",
        statusDescription: `Questa seduta è prevista per ${plannedDateLabel}. Puoi anticiparla se hai cambiato programma.`,
        ctaLabel: "Inizia comunque",
        ctaVariant: "secondary" as const,
        showSkipAction: true,
        showKeepSkippedAction: false,
      };
    case "in_progress":
      return {
        statusLabel: "Allenamento in corso",
        statusDescription: null,
        ctaLabel: "Continua seduta",
        ctaVariant: "primary" as const,
        showSkipAction: false,
        showKeepSkippedAction: false,
      };
    case "completed":
      return {
        statusLabel: "Seduta completata",
        statusDescription: "Hai già completato questa seduta questa settimana.",
        ctaLabel: "Modifica dati",
        ctaVariant: "secondary" as const,
        showSkipAction: false,
        showKeepSkippedAction: false,
      };
    case "skipped":
      return {
        statusLabel: "Seduta saltata",
        statusDescription: "Hai segnato questa seduta come saltata.",
        ctaLabel: "Recupera seduta",
        ctaVariant: "primary" as const,
        showSkipAction: false,
        showKeepSkippedAction: true,
      };
  }
}

function getProgramFocusSummary(
  workouts: Array<{ title: string; focus: string | null }>
) {
  return workouts
    .map((workout) => workout.focus ?? workout.title)
    .filter(Boolean)
    .join(" / ");
}

function getProgramSplitSummary(
  workouts: Array<{ title: string; dayLabel: string | null }>
) {
  return workouts
    .map((workout) => workout.title || workout.dayLabel || "Workout")
    .join(" / ");
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

function getNotePreview(note: string, maxLength = 160) {
  const normalizedNote = note.replace(/\s+/g, " ").trim();

  if (normalizedNote.length <= maxLength) {
    return normalizedNote;
  }

  return `${normalizedNote.slice(0, maxLength).trimEnd()}...`;
}

function getTrainingEngineLabel(source: string | null) {
  switch (source) {
    case "rules_v2":
      return "Creato in base alle tue risposte piu recenti";
    case "rules_v1":
      return "Creato in base alle tue risposte iniziali";
    default:
      return "Creato in base al tuo profilo attuale";
  }
}

function ProgramActions({
  canCreateProgram,
  createLabel,
}: {
  canCreateProgram: boolean;
  createLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link
        href="/dashboard"
        className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100"
      >
        Torna alla dashboard
      </Link>

      <Link
        href="/onboarding"
        className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100"
      >
        Modifica obiettivo
      </Link>

      {canCreateProgram && createLabel ? (
        <CreateDemoProgramButton label={createLabel} />
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed justify-center rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-3 font-semibold text-neutral-500"
        >
          Tracciamento sedute in arrivo
        </button>
      )}
    </div>
  );
}

type ProgramPageProps = {
  searchParams?: Promise<{
    created?: string | string[];
    programId?: string | string[];
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
  const createdProgramId = getSingleSearchParam(searchParams.programId);
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const currentWeekEnd = getWeekEnd(now);

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
    onboardingAnswers.map((answer) => answer.answersJson)
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
  const sanitizedProgramNotePreview = sanitizedProgramNotes
    ? getNotePreview(sanitizedProgramNotes)
    : null;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 pb-28 text-white">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-neutral-500">
            Personal Trainer AI
          </p>
          <h1 className="text-3xl font-bold">Il tuo programma</h1>
        </div>

        {created ? (
          <div className="mb-6 rounded-2xl border border-emerald-700 bg-emerald-950/60 p-5">
            <p className="text-sm font-semibold text-emerald-200">
              Nuovo programma creato correttamente.
            </p>
            {createdProgramId ? (
              <p className="mt-1 text-sm text-emerald-300">
                Versione programma: #{createdProgramId}
              </p>
            ) : null}
          </div>
        ) : null}

        {!activeProgram ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-6 text-neutral-300">
              Non hai ancora un programma attivo.
            </p>
            <ProgramActions
              canCreateProgram
              createLabel="Crea il tuo primo programma"
            />
          </div>
        ) : (
          <div className="space-y-6">
            {onboardingChangedSinceProgram ? (
              <section className="rounded-2xl border border-amber-700 bg-amber-950/40 p-6">
                <p className="text-sm font-semibold text-amber-200">
                  Hai aggiornato le tue risposte iniziali dopo la creazione del programma
                  attuale.
                </p>
                <p className="mt-2 text-sm text-amber-100">
                  Puoi creare una nuova fase del programma coerente con i nuovi dati. Il
                  programma attuale verrà archiviato, ma resterà nello storico.
                </p>
                <div className="mt-5">
                  <CreateDemoProgramButton label="Crea una nuova fase del programma" />
                </div>
              </section>
            ) : null}

            {engineUpdateAvailable ? (
              <section className="rounded-2xl border border-sky-700 bg-sky-950/40 p-6">
                <p className="text-sm font-semibold text-sky-200">
                  Aggiornamento disponibile
                </p>
                <p className="mt-2 text-sm text-sky-100">
                  Sono disponibili criteri aggiornati per proporre gli esercizi.
                  Puoi creare una nuova fase del programma con le indicazioni piu recenti.
                </p>
                <p className="mt-2 text-sm text-sky-100">
                  Il programma attuale verrà archiviato, ma resterà nello
                  storico.
                </p>
                <div className="mt-5">
                  <CreateDemoProgramButton label="Crea programma aggiornato" />
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                    Programma attivo
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {activeProgram.title}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/weekly-review"
                      className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
                    >
                      Revisione settimanale
                    </Link>
                    <Link
                      href="/block-review"
                      className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
                    >
                      Revisione del programma
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">
                    {getTrainingEngineLabel(activeProgram.source)}
                  </p>
                </div>

                <div className="grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Nome programma</p>
                    <p className="mt-1 font-semibold text-white">
                      {activeProgram.title}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Obiettivo</p>
                    <p className="mt-1 font-semibold text-white">
                      {activeProgram.goal ?? "Non indicato"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Durata programma</p>
                    <p className="mt-1 font-semibold text-white">
                      {getProgramDurationWeeks(activeProgram)} settimane
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Settimana corrente</p>
                    <p className="mt-1 font-semibold text-white">
                      {getCurrentBlockWeek(
                        getProgramStartedAt(activeProgram),
                        getProgramDurationWeeks(activeProgram)
                      )}{" "}
                      di {getProgramDurationWeeks(activeProgram)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Data inizio</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatItalianDate(getProgramStartedAt(activeProgram))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Prossima revisione</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatItalianDate(
                        activeProgram.plannedReviewAt ??
                          new Date(
                            getProgramStartedAt(activeProgram).getTime() +
                              getProgramDurationWeeks(activeProgram) *
                                7 *
                                24 *
                                60 *
                                60 *
                                1000
                          )
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
                  <p className="font-medium text-white">Nota principale</p>
                  <p className="mt-2">
                    {sanitizedProgramNotePreview ?? "Nessuna nota disponibile."}
                  </p>
                </div>

                {sanitizedProgramNotes &&
                sanitizedProgramNotePreview !== sanitizedProgramNotes.replace(/\s+/g, " ").trim() ? (
                  <ProgramNotesToggle fullText={sanitizedProgramNotes} />
                ) : null}

                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
                  <p className="text-neutral-500">Distribuzione degli allenamenti</p>
                  <p className="mt-1 font-semibold text-white">
                    {getProgramSplitSummary(activeProgram.workouts)}
                  </p>
                  <p className="mt-2 text-xs text-neutral-400">
                    {getProgramFocusSummary(activeProgram.workouts)}
                  </p>
                </div>

                <ProgramActions
                  canCreateProgram={false}
                  createLabel={undefined}
                />

                <p className="text-xs text-neutral-500">
                  Ultimo aggiornamento:{" "}
                  {formatItalianDateTime(activeProgram.updatedAt)}
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Coach</h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    Lettura del programma attivo basata sui dati disponibili, senza modifiche automatiche.
                  </p>
                </div>

                <Link
                  href="/coach"
                  className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
                >
                  Apri chat coach
                </Link>
              </div>

              <AiCoachCard
                mode="program_overview"
                buttonLabel="Analizza il programma"
              />
            </section>

            <section className="space-y-4">
              <div className="px-1">
                <h3 className="text-xl font-semibold">Sedute del programma</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  {profile.daysPerWeek} giorni/settimana ·{" "}
                  {profile.sessionMinutes
                    ? `${profile.sessionMinutes} min per sessione`
                    : "Durata sessione non indicata"}
                </p>
              </div>

              <div className="space-y-4">
                {getWorkoutScheduleForProgram(activeProgram.workouts, now).map(
                  ({ workout, plannedDateLabel, plannedDateThisWeek }) => {
                    const currentWeekLog =
                      workout.workoutLogs.find(
                        (workoutLog) =>
                          workoutLog.performedAt >= currentWeekStart &&
                          workoutLog.performedAt <= currentWeekEnd
                      ) ?? null;
                    const latestWorkoutLog = workout.workoutLogs[0] ?? null;
                    const workoutState = getFlexibleWorkoutState({
                      plannedDateThisWeek,
                      plannedDateLabel,
                      weekLog: currentWeekLog,
                      referenceDate: now,
                    });
                    const copy = getFlexibleStatusCopy(
                      workoutState.state,
                      plannedDateLabel
                    );

                    return (
                      <ProgramWorkoutCard
                        key={workout.id}
                        workoutId={workout.id}
                        plannedDateLabel={plannedDateLabel}
                        title={workout.title}
                        focus={
                          sanitizeUserFacingText(workout.focus) ??
                          sanitizeUserFacingNotes(workout.notes) ??
                          "Focus non indicato"
                        }
                        statusLabel={copy.statusLabel}
                        statusDescription={copy.statusDescription}
                        ctaLabel={copy.ctaLabel}
                        ctaHref={`/workouts/${workout.id}`}
                        ctaVariant={copy.ctaVariant}
                        lastSessionLabel={
                          latestWorkoutLog
                            ? `Ultima seduta ${formatItalianDate(
                                latestWorkoutLog.performedAt
                              )}`
                            : null
                        }
                        showSkipAction={copy.showSkipAction}
                        showKeepSkippedAction={copy.showKeepSkippedAction}
                        exercises={workout.exercises.map((exercise) => ({
                          id: exercise.id,
                          name: exercise.name,
                          prescription: formatExercisePrescription(
                            exercise.sets,
                            exercise.reps
                          ),
                          rest: formatRest(exercise.restSeconds),
                          intensity: exercise.intensity ?? "Non indicata",
                          notes: exercise.notes,
                        }))}
                      />
                    );
                  }
                )}
              </div>
            </section>
          </div>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
