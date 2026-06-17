import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { getCurrentUser } from "@/lib/session";
import { getWorkoutPageDataForUser } from "@/lib/workout-execution";
import { WorkoutLogForm } from "./workout-log-form";

export const dynamic = "force-dynamic";

type WorkoutPageProps = {
  params: Promise<{
    workoutId: string;
  }>;
};

export default async function WorkoutPage(props: WorkoutPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const { workoutId: workoutIdParam } = await props.params;
  const workoutId = Number(workoutIdParam);

  if (!Number.isInteger(workoutId) || workoutId <= 0) {
    redirect("/program");
  }

  const workoutData = await getWorkoutPageDataForUser(user.id, workoutId);

  if (!workoutData) {
    redirect("/program");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 pb-28 text-white">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-4">
          <Link
            href="/program"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
          >
            ← Torna al programma
          </Link>
        </div>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                {workoutData.workout.dayLabel ?? "Seduta"}
              </p>
              <h1 className="mt-3 text-3xl font-bold">{workoutData.workout.title}</h1>
              <p className="mt-3 text-sm text-neutral-400">
                Focus: {workoutData.workout.focus ?? "Non indicato"}
              </p>
              <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-sm text-neutral-500">Note seduta</p>
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">
                  {workoutData.workout.notes ?? "Nessuna nota disponibile."}
                </p>
              </div>
            </div>

            <div className="min-w-52 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Stato</p>
              <p className="mt-2 text-base font-semibold text-white">
                {workoutData.existingLog?.status === "completed"
                  ? "Completato"
                  : workoutData.existingLog?.status === "in_progress"
                    ? "In corso"
                    : "Da completare"}
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                {workoutData.existingLog
                  ? "I progressi salvati verranno ripristinati automaticamente."
                  : "Inizia quando sei pronto e salva i progressi durante la seduta."}
              </p>
            </div>
          </div>
        </section>

        <WorkoutLogForm
          workout={workoutData.workout}
          exercises={workoutData.exercises}
          existingLog={workoutData.existingLog}
        />
      </section>

      <AppBottomNav />
    </main>
  );
}
