import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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

function formatItalianDateTime(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

function ProgramActions({
  hasActiveProgram,
}: {
  hasActiveProgram: boolean;
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
        Modifica questionario
      </Link>

      {hasActiveProgram ? (
        <CreateDemoProgramButton label="Rigenera programma demo" />
      ) : (
        <CreateDemoProgramButton label="Crea programma demo" />
      )}
    </div>
  );
}

type ProgramPageProps = {
  searchParams?: Promise<{
    regenerated?: string | string[];
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
  const regenerated = getSingleSearchParam(searchParams.regenerated) === "1";
  const regeneratedProgramId = getSingleSearchParam(searchParams.programId);

  const activeProgram = await prisma.trainingProgram.findFirst({
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
  });

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-neutral-500">
            Personal Trainer AI
          </p>
          <h1 className="text-3xl font-bold">Il tuo programma</h1>
        </div>

        {regenerated ? (
          <div className="mb-6 rounded-2xl border border-emerald-700 bg-emerald-950/60 p-5">
            <p className="text-sm font-semibold text-emerald-200">
              Programma rigenerato correttamente.
            </p>
            {regeneratedProgramId ? (
              <p className="mt-1 text-sm text-emerald-300">
                Versione programma: #{regeneratedProgramId}
              </p>
            ) : null}
          </div>
        ) : null}

        {!activeProgram ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-6 text-neutral-300">
              Non hai ancora un programma attivo.
            </p>
            <ProgramActions hasActiveProgram={false} />
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{activeProgram.title}</h2>
                  <p className="mt-2 text-sm text-neutral-400">
                    Obiettivo: {activeProgram.goal ?? "Non indicato"}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    Ultimo aggiornamento:{" "}
                    {formatItalianDateTime(activeProgram.updatedAt)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Versione programma: #{activeProgram.id}
                  </p>
                </div>

                <ProgramActions hasActiveProgram />
              </div>

              {activeProgram.notes ? (
                <p className="mt-6 whitespace-pre-line rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                  {activeProgram.notes}
                </p>
              ) : null}
            </section>

            {activeProgram.workouts.map((workout) => (
              <section
                key={workout.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
              >
                <div className="mb-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                    {workout.dayLabel ?? "Workout"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{workout.title}</h3>
                  <p className="mt-2 text-sm text-neutral-400">
                    Focus: {workout.focus ?? "Non indicato"} · Durata stimata:{" "}
                    {workout.estimatedMinutes
                      ? `${workout.estimatedMinutes} min`
                      : "Non indicata"}
                  </p>
                  {workout.notes ? (
                    <p className="mt-3 text-sm text-neutral-300">{workout.notes}</p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {workout.exercises.map((exercise) => (
                    <article
                      key={exercise.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="text-lg font-semibold">{exercise.name}</h4>
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
                        <p>Intensita target: {exercise.intensity ?? "Non indicata"}</p>
                        <p>Note: {exercise.notes ?? "Nessuna nota"}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
