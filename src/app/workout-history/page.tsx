import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import {
  getWorkoutHistoryForUser,
  getWorkoutStatusLabel,
} from "@/lib/workout-history";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatItalianDateTime(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatSetValue(value: number | null, suffix: string) {
  return value === null ? `${suffix} n/d` : `${value} ${suffix}`;
}

export default async function WorkoutHistoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const history = await getWorkoutHistoryForUser(user.id);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 pb-28 text-white">
      <section className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="mt-3 text-3xl font-bold">Storico allenamenti</h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              Sedute completate, in corso o saltate in ordine dalla piu recente alla piu vecchia.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Dashboard
            </Link>
            <Link
              href="/program"
              className="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950"
            >
              Vai al programma
            </Link>
          </div>
        </div>

        {history.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">Nessuna seduta registrata</h2>
            <p className="mt-3 text-sm text-neutral-400">
              Quando salverai i progressi o completerai una seduta, la troverai qui.
            </p>
          </section>
        ) : (
          <div className="mt-8 space-y-5">
            {history.map((entry) => (
              <details
                key={entry.id}
                className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                        Seduta del {formatItalianDateTime(entry.performedAt)}
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold">
                        {entry.workoutName}
                      </h2>
                      <p className="mt-2 text-sm text-neutral-400">
                        Programma: {entry.programName}
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm text-neutral-300 sm:grid-cols-3 lg:min-w-[420px]">
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                        <p className="text-neutral-500">Stato</p>
                        <p className="mt-1 font-medium text-white">
                          {getWorkoutStatusLabel(entry.status)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                        <p className="text-neutral-500">Fatica percepita</p>
                        <p className="mt-1 font-medium text-white">
                          {entry.perceivedEffort ?? "Non indicata"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                        <p className="text-neutral-500">Progressi registrati</p>
                        <p className="mt-1 font-medium text-white">
                          {entry.exercises.reduce(
                            (total, exercise) => total + exercise.sets.length,
                            0
                          )}{" "}
                          serie
                        </p>
                      </div>
                    </div>
                  </div>

                  {entry.notes ? (
                    <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                      <p className="text-sm text-neutral-500">Note seduta</p>
                      <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">
                        {entry.notes}
                      </p>
                    </div>
                  ) : null}

                  <span className="mt-5 inline-flex rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-100">
                    <span className="group-open:hidden">Vedi dettagli ↓</span>
                    <span className="hidden group-open:inline">Nascondi dettagli ↑</span>
                  </span>
                </summary>

                <div className="mt-6 border-t border-neutral-800 pt-6">
                  <h3 className="text-lg font-semibold">Dati della serie</h3>
                  {entry.exercises.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                      Nessun dato serie registrato.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {entry.exercises.map((exercise) => (
                        <section
                          key={`${entry.id}-${exercise.programExerciseId ?? exercise.exerciseName}`}
                          className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
                        >
                          <h4 className="text-base font-semibold text-white">
                            {exercise.exerciseName}
                          </h4>
                          <div className="mt-3 space-y-2 text-sm text-neutral-300">
                            {exercise.sets.map((set) => (
                              <p key={set.id}>
                                Serie {set.setNumber}: {formatSetValue(set.weightKg, "kg")} x{" "}
                                {set.actualReps ?? "reps n/d"} -{" "}
                                {set.rir === null ? "RIR n/d" : `RIR ${set.rir}`} -{" "}
                                {set.completed ? "Completata: si" : "Completata: no"}
                              </p>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
