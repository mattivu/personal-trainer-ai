import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AiCoachCard } from "@/components/ai-coach-card";
import { getCurrentUser } from "@/lib/session";
import { getWorkoutPageDataForUser } from "@/lib/workout-execution";
import type { FlexibleWorkoutState } from "@/lib/workout-schedule";
import { WorkoutLogForm } from "./workout-log-form";

export const dynamic = "force-dynamic";

type WorkoutPageProps = {
  params: Promise<{
    workoutId: string;
  }>;
};

function getWorkoutStateCopy(state: FlexibleWorkoutState, plannedDateLabel: string) {
  switch (state) {
    case "recommended_today":
      return {
        statusLabel: "Consigliata oggi",
        statusDescription: "Puoi iniziare la seduta consigliata per oggi.",
      };
    case "overdue":
      return {
        statusLabel: "Da recuperare",
        statusDescription: `Questa seduta era prevista per ${plannedDateLabel}.`,
      };
    case "future_available":
      return {
        statusLabel: "Prevista più avanti",
        statusDescription:
          "Questa seduta è prevista più avanti. Puoi iniziarla comunque se hai modificato la tua settimana.",
      };
    case "in_progress":
      return {
        statusLabel: "Allenamento in corso",
        statusDescription:
          "I dati già registrati restano disponibili e puoi continuare la compilazione da dove avevi lasciato.",
      };
    case "completed":
      return {
        statusLabel: "Seduta completata",
        statusDescription:
          "Hai già completato questa seduta questa settimana. Puoi solo modificare i dati registrati.",
      };
    case "skipped":
      return {
        statusLabel: "Seduta saltata",
        statusDescription:
          "Hai segnato questa seduta come saltata. Puoi recuperarla quando vuoi.",
      };
  }
}

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

  const copy = getWorkoutStateCopy(
    workoutData.workoutState,
    workoutData.plannedDateLabel
  );

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
                Giorno consigliato: {workoutData.plannedDateLabel}
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
                {copy.statusLabel}
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                {copy.statusDescription}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <AiCoachCard
            mode="workout_guidance"
            workoutId={workoutData.workout.id}
            buttonLabel="Analizza questa seduta"
          />
        </section>

        <WorkoutLogForm
          workout={workoutData.workout}
          exercises={workoutData.exercises}
          existingLog={workoutData.existingLog}
          workoutState={workoutData.workoutState}
          plannedDateLabel={workoutData.plannedDateLabel}
        />
      </section>

      <AppBottomNav />
    </main>
  );
}
