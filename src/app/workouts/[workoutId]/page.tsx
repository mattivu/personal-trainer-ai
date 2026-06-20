import Link from "next/link";
import { redirect } from "next/navigation";
import { AiCoachCard } from "@/components/ai-coach-card";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppCard } from "@/components/ui/app-card";
import { AppPage } from "@/components/ui/app-page";
import { EmptyState } from "@/components/ui/empty-state";
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
        statusLabel: "Oggi",
        statusDescription: "Pronta da iniziare.",
      };
    case "overdue":
      return {
        statusLabel: "Da recuperare",
        statusDescription: `Era prevista per ${plannedDateLabel}.`,
      };
    case "future_available":
      return {
        statusLabel: "Disponibile",
        statusDescription: "Puoi farla anche prima se ti serve.",
      };
    case "in_progress":
      return {
        statusLabel: "In corso",
        statusDescription: "Puoi riprendere da dove avevi lasciato.",
      };
    case "completed":
      return {
        statusLabel: "Completata",
        statusDescription: "Hai gia completato questa seduta questa settimana.",
      };
    case "skipped":
      return {
        statusLabel: "Saltata",
        statusDescription: "Puoi recuperarla quando vuoi.",
      };
  }
}

function getWorkoutStateBadgeClasses(state: FlexibleWorkoutState) {
  switch (state) {
    case "recommended_today":
      return "border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]";
    case "in_progress":
      return "border-white/12 bg-white/[0.055] text-[var(--app-text)]";
    case "completed":
      return "border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]";
    case "skipped":
      return "border-white/8 bg-white/[0.03] text-white/55";
    case "overdue":
    case "future_available":
    default:
      return "border-white/8 bg-white/[0.035] text-white/72";
  }
}

function extractCardioCallout(notes: string | null) {
  if (!notes?.toLowerCase().includes("cardio")) {
    return null;
  }

  return "Richiamo cardio";
}

function getIntensitySummary(
  exercises: Array<{
    intensity: string | null;
  }>,
) {
  const labels = Array.from(
    new Set(
      exercises
        .map((exercise) => exercise.intensity?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (labels.length === 0) {
    return "Da definire";
  }

  return labels.slice(0, 2).join(" · ");
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M19 12H5M11 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
    workoutData.plannedDateLabel,
  );
  const summaryItems = [
    {
      label: "Focus",
      value: workoutData.workout.focus ?? "Da definire",
    },
    {
      label: "Quando",
      value: workoutData.plannedDateLabel,
    },
    {
      label: "Esercizi",
      value: `${workoutData.exercises.length}`,
    },
    {
      label: "Intensita",
      value: getIntensitySummary(workoutData.exercises),
    },
  ];
  const cardioCallout = extractCardioCallout(workoutData.workout.notes);

  return (
    <AppPage className="pb-28">
      <section className="pt-[62px]">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/program"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[13px] font-semibold text-[var(--app-text)] transition hover:border-white/16 hover:bg-white/[0.05]"
          >
            <ArrowLeftIcon />
            Programma
          </Link>
          <span
            className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${getWorkoutStateBadgeClasses(
              workoutData.workoutState,
            )}`}
          >
            {copy.statusLabel}
          </span>
        </div>

        <header className="mt-5">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
            Seduta
          </p>
          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em] text-[var(--app-text)]">
            {workoutData.workout.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--app-muted)]">{copy.statusDescription}</p>
        </header>

        <AppCard
          soft
          className="mt-5 rounded-[24px] border border-white/8 bg-[var(--app-surface)] p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-white/7 bg-[var(--app-bg)]/55 px-3.5 py-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  {item.label}
                </p>
                <p className="mt-1 text-[14px] font-semibold leading-5 text-[var(--app-text)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          {cardioCallout ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="app-pill">{cardioCallout}</span>
            </div>
          ) : null}
        </AppCard>

        {workoutData.exercises.length === 0 ? (
          <EmptyState
            className="mt-5"
            title="Nessun esercizio disponibile per questa seduta."
            description="Torna al programma e riprova tra poco."
            action={
              <Link
                href="/program"
                className="inline-flex min-h-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:border-white/16 hover:bg-white/[0.05]"
              >
                Torna al programma
              </Link>
            }
          />
        ) : (
          <WorkoutLogForm
            workout={workoutData.workout}
            exercises={workoutData.exercises}
            existingLog={workoutData.existingLog}
            workoutState={workoutData.workoutState}
            plannedDateLabel={workoutData.plannedDateLabel}
          />
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
              Coach
            </p>
            <Link
              href={`/coach?workoutId=${workoutData.workout.id}`}
              className="text-[12px] font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              Apri chat
            </Link>
          </div>
          <AiCoachCard
            mode="workout_guidance"
            workoutId={workoutData.workout.id}
            buttonLabel="Analizza questa seduta"
          />
        </section>
      </section>

      <AppBottomNav />
    </AppPage>
  );
}
