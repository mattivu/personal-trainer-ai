import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppPage } from "@/components/ui/app-page";
import {
  getWorkoutHistoryForUser,
  getWorkoutStatusLabel,
} from "@/lib/workout-history";
import { getCurrentUser } from "@/lib/session";
import { WorkoutHistoryView } from "./workout-history-view";

export const dynamic = "force-dynamic";

const ITALY_TIME_ZONE = "Europe/Rome";
const RECENT_CONSISTENCY_DAYS = 7;

function getDayKey(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ITALY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(dayKey: string, amount: number) {
  const date = parseDayKey(dayKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return getDayKey(date);
}

function formatHistoryMoment(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ITALY_TIME_ZONE,
  }).format(date);
}

function formatHistoryTime(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ITALY_TIME_ZONE,
  }).format(date);
}

function calculateConsistency(history: Awaited<ReturnType<typeof getWorkoutHistoryForUser>>) {
  const todayKey = getDayKey(new Date());
  const validKeys = new Set<string>();

  for (let offset = 0; offset < RECENT_CONSISTENCY_DAYS; offset += 1) {
    validKeys.add(addDays(todayKey, -offset));
  }

  const completedDays = new Set(
    history
      .filter((entry) => entry.status === "completed")
      .map((entry) => getDayKey(entry.performedAt))
      .filter((dayKey) => validKeys.has(dayKey))
  );

  return Math.round((completedDays.size / RECENT_CONSISTENCY_DAYS) * 100);
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
  const completedSessions = history.filter((entry) => entry.status === "completed").length;
  const consistency = calculateConsistency(history);
  const todayKey = getDayKey(new Date());

  const serializedHistory = history.map((entry) => ({
    id: entry.id,
    performedAtIso: entry.performedAt.toISOString(),
    performedAtLabel: formatHistoryMoment(entry.performedAt),
    timeLabel: formatHistoryTime(entry.performedAt),
    dayKey: getDayKey(entry.performedAt),
    startedAtIso: entry.startedAt?.toISOString() ?? null,
    completedAtIso: entry.completedAt?.toISOString() ?? null,
    updatedAtIso: entry.updatedAt.toISOString(),
    status: entry.status,
    statusLabel: getWorkoutStatusLabel(entry.status),
    perceivedEffort: entry.perceivedEffort,
    notes: entry.notes,
    workoutName: entry.workoutName,
    programName: entry.programName,
    exerciseCount: entry.exercises.length,
    totalSets: entry.exercises.reduce((total, exercise) => total + exercise.sets.length, 0),
    hasFeedback: Boolean(entry.notes) || entry.perceivedEffort !== null,
    exercises: entry.exercises.map((exercise) => ({
      programExerciseId: exercise.programExerciseId,
      exerciseName: exercise.exerciseName,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        setNumber: set.setNumber,
        weightKg: set.weightKg,
        actualReps: set.actualReps,
        rir: set.rir,
        completed: set.completed,
      })),
    })),
  }));

  return (
    <AppPage className="pt-5" contentClassName="pb-2">
      <div className="space-y-4 pt-[62px]">
        <header className="px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
            Progressi e sedute registrate
          </p>
          <h1 className="mt-2 text-[30px] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--app-text)]">
            Storico allenamenti
          </h1>
        </header>

        <WorkoutHistoryView
          history={serializedHistory}
          completedSessions={completedSessions}
          consistency={consistency}
          todayKey={todayKey}
          weeklyReviewHref="/weekly-review"
          programHref="/program"
        />
      </div>

      <AppBottomNav />
    </AppPage>
  );
}
