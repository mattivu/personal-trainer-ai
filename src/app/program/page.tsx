import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildNormalizedOnboardingProfile } from "@/lib/training-engine/onboarding-profile";
import {
  getCurrentBlockWeek,
  getTrainingBlockDurationWeeks,
} from "@/lib/training-engine/program-block";
import { CreateDemoProgramButton } from "./create-demo-program-button";

export const dynamic = "force-dynamic";

function formatRest(restSeconds: number | null) {
  if (restSeconds === null) {
    return "Non indicato";
  }

  if (restSeconds === 0) {
    return "0 sec";
  }

  return `${restSeconds} sec`;
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
          Log allenamenti in arrivo
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
                performedAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                status: true,
                performedAt: true,
              },
            },
            exercises: {
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
              Nuovo blocco di allenamento creato correttamente.
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
              Non hai ancora un blocco di allenamento attivo.
            </p>
            <ProgramActions
              canCreateProgram
              createLabel="Crea il tuo primo blocco di allenamento"
            />
          </div>
        ) : (
          <div className="space-y-6">
            {onboardingChangedSinceProgram ? (
              <section className="rounded-2xl border border-amber-700 bg-amber-950/40 p-6">
                <p className="text-sm font-semibold text-amber-200">
                  Hai modificato il questionario dopo la creazione del programma
                  attuale.
                </p>
                <p className="mt-2 text-sm text-amber-100">
                  Puoi creare un nuovo blocco coerente con i nuovi dati. Il
                  programma attuale verrà archiviato, ma resterà nello storico.
                </p>
                <div className="mt-5">
                  <CreateDemoProgramButton label="Crea nuovo blocco dal questionario aggiornato" />
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                    Blocco attivo
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {activeProgram.title}
                  </h2>
                  <p className="mt-2 text-sm text-neutral-400">
                    Generato da: Training Engine v1
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Versione programma #{activeProgram.id}
                  </p>
                </div>

                <div className="grid gap-4 text-sm text-neutral-300 sm:grid-cols-2">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Durata</p>
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

                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Obiettivo</p>
                    <p className="mt-1 font-semibold text-white">
                      {activeProgram.goal ?? "Non indicato"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="text-neutral-500">Split / focus</p>
                    <p className="mt-1 font-semibold text-white">
                      {getProgramSplitSummary(activeProgram.workouts)}
                    </p>
                    <p className="mt-2 text-xs text-neutral-400">
                      {getProgramFocusSummary(activeProgram.workouts)}
                    </p>
                  </div>
                </div>

                <ProgramActions
                  canCreateProgram={false}
                  createLabel={undefined}
                />
              </div>

              <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                <p className="font-semibold text-white">
                  Note su progressione / RIR / cedimento / recuperi
                </p>
                <p className="mt-3 whitespace-pre-line">
                  {activeProgram.notes ?? "Nessuna nota disponibile."}
                </p>
              </div>

              <p className="mt-4 text-xs text-neutral-500">
                Ultimo aggiornamento: {formatItalianDateTime(activeProgram.updatedAt)}
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="mb-5">
                <h3 className="text-xl font-semibold">Profilo corrente letto dal questionario</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Obiettivo: {activeProgram.goal ?? "Non indicato"} · Frequenza:{" "}
                  {profile.daysPerWeek} giorni/settimana · Durata sessione:{" "}
                  {profile.sessionMinutes ? `${profile.sessionMinutes} min` : "Non indicata"}
                </p>
              </div>

              <div className="space-y-6">
                {activeProgram.workouts.map((workout) => (
                  <section
                    key={workout.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <div className="mb-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                        {workout.dayLabel ?? "Workout"}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold">{workout.title}</h4>
                      <p className="mt-2 text-sm text-neutral-400">
                        Focus: {workout.focus ?? "Non indicato"} · Durata stimata:{" "}
                        {workout.estimatedMinutes
                          ? `${workout.estimatedMinutes} min`
                          : "Non indicata"}
                      </p>
                      {workout.notes ? (
                        <p className="mt-3 text-sm text-neutral-300">
                          {workout.notes}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          href={`/workouts/${workout.id}`}
                          className="inline-flex justify-center rounded-xl bg-white px-4 py-2 font-semibold text-neutral-950"
                        >
                          Inizia seduta
                        </Link>

                        {workout.workoutLogs[0] ? (
                          <p className="text-sm text-neutral-400">
                            {workout.workoutLogs[0].status === "completed"
                              ? "Completato"
                              : "Da completare"}{" "}
                            · Ultimo log {formatItalianDate(workout.workoutLogs[0].performedAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {workout.exercises.map((exercise) => (
                        <article
                          key={exercise.id}
                          className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h5 className="text-lg font-semibold">{exercise.name}</h5>
                              <p className="mt-1 text-sm text-neutral-400">
                                Muscolo primario:{" "}
                                {exercise.exercise?.primaryMuscle ?? "Non indicato"}
                              </p>
                            </div>

                            <div className="grid gap-1 text-sm text-neutral-300 sm:text-right">
                              <p>Serie: {exercise.sets ?? "Non indicate"}</p>
                              <p>Reps: {exercise.reps ?? "Non indicate"}</p>
                              <p>Recupero: {formatRest(exercise.restSeconds)}</p>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2 text-sm text-neutral-300">
                            <p>
                              Intensita target:{" "}
                              {exercise.intensity ?? "Non indicata"}
                            </p>
                            <p>Note: {exercise.notes ?? "Nessuna nota"}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
