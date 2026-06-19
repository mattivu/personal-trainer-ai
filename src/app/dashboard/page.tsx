import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppCard } from "@/components/ui/app-card";
import { AppPage } from "@/components/ui/app-page";
import { PrimaryButton } from "@/components/ui/buttons";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getBodyWeightOverviewForUser } from "@/lib/body-weight";
import {
  getDailyNutritionData,
  getNutritionDailySummary,
} from "@/lib/nutrition/profile";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getFlexibleWorkoutState,
  getWeekEnd,
  getWeekStart,
  getWorkoutScheduleForProgram,
} from "@/lib/workout-schedule";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

function formatDashboardDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  })
    .format(date)
    .toUpperCase();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function formatWeight(value: number | null) {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDelta(value: number | null) {
  if (value === null) {
    return null;
  }

  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value));

  if (value === 0) {
    return `${formatted} kg`;
  }

  return `${value > 0 ? "+" : "-"}${formatted} kg`;
}

function getGreeting(name: string | null) {
  if (!name) {
    return "Ciao";
  }

  const firstName = name.trim().split(/\s+/)[0];
  return `Ciao, ${firstName}`;
}

function getInitial(name: string | null) {
  const fallback = "U";

  if (!name) {
    return fallback;
  }

  return name.trim().charAt(0).toUpperCase() || fallback;
}

function getProgramWindow(program: {
  startedAt: Date | null;
  startDate: Date | null;
  createdAt: Date;
  durationWeeks: number | null;
}) {
  const startedAt = program.startedAt ?? program.startDate ?? program.createdAt;

  if (!program.durationWeeks) {
    return null;
  }

  const elapsedWeeks = Math.max(
    1,
    Math.ceil((Date.now() - startedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)),
  );

  return {
    currentWeek: Math.min(elapsedWeeks, program.durationWeeks),
    durationWeeks: program.durationWeeks,
  };
}

function getWorkoutPriority(state: string) {
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

function getHeroCopy(state: string) {
  switch (state) {
    case "in_progress":
      return {
        badge: "PROSSIMA SEDUTA · IN CORSO",
        cta: "Apri seduta",
      };
    case "recommended_today":
      return {
        badge: "PROSSIMA SEDUTA · OGGI",
        cta: "Inizia seduta",
      };
    case "overdue":
    case "skipped":
      return {
        badge: "PROSSIMA SEDUTA · DA RECUPERARE",
        cta: "Apri seduta",
      };
    case "future_available":
    default:
      return {
        badge: "PROSSIMA SEDUTA",
        cta: "Apri seduta",
      };
  }
}

function getProgramHeadline(
  program: { goal: string | null; title: string } | null,
) {
  if (!program) {
    return "Nuovo programma";
  }

  return program.goal?.trim() || program.title;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 12 20" fill="none" className="h-4 w-2.5">
      <path
        d="m2 2 8 8-8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NutritionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WeightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 12l3-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 5h16v11H9l-4 4v-4H4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NutritionRing({
  progress,
  centerValue,
}: {
  progress: number;
  centerValue: string;
}) {
  const safeProgress = Math.max(0, Math.min(progress, 100));
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="relative h-[64px] w-[64px] shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(247,249,250,0.1)"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--app-primary)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-metrics text-[15px] font-semibold leading-none text-[var(--app-text)]">
          {centerValue}
        </span>
        <span className="mt-1 text-[9px] uppercase tracking-[0.08em] text-white/40">
          kcal
        </span>
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="mt-auto h-8 rounded-[12px] bg-[linear-gradient(90deg,rgba(208,216,43,0.18),rgba(208,216,43,0.02))]" />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 112;
  const height = 32;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="mt-auto h-8 w-full"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--app-primary)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

type CompactCardProps = {
  title: string;
  href: string;
  children: ReactNode;
};

function CompactInfoCard({ title, href, children }: CompactCardProps) {
  return (
    <Link href={href} className="block">
      <AppCard
        soft
        className="flex min-h-[176px] flex-col rounded-[22px] border-white/8 bg-[var(--app-surface)] px-4 py-4 shadow-none transition hover:border-white/12"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
          {title}
        </p>
        <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
      </AppCard>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);

  try {
    const [activeProgram, nutritionProfile, dailyNutritionData, bodyWeightOverview] =
      await Promise.all([
        prisma.trainingProgram.findFirst({
          where: {
            userId: user.id,
            status: "active",
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            workouts: {
              orderBy: {
                sortOrder: "asc",
              },
              include: {
                exercises: {
                  where: {
                    isActive: true,
                  },
                  select: {
                    id: true,
                  },
                },
                workoutLogs: {
                  where: {
                    userId: user.id,
                    performedAt: {
                      gte: weekStart,
                      lte: weekEnd,
                    },
                  },
                  orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
                  select: {
                    id: true,
                    status: true,
                    performedAt: true,
                    startedAt: true,
                    completedAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        }),
        prisma.nutritionProfile.findUnique({
          where: {
            userId: user.id,
          },
        }),
        getDailyNutritionData(user.id),
        getBodyWeightOverviewForUser(user.id),
      ]);

    const activeWorkouts =
      activeProgram?.workouts.filter((workout) => workout.exercises.length > 0) ?? [];
    const schedule = getWorkoutScheduleForProgram(activeWorkouts, now).map((entry) => {
      const latestWeekLog = entry.workout.workoutLogs[0] ?? null;
      const state = getFlexibleWorkoutState({
        plannedDateThisWeek: entry.plannedDateThisWeek,
        plannedDateLabel: entry.plannedDateLabel,
        weekLog: latestWeekLog,
        referenceDate: now,
      });

      return {
        ...entry,
        latestWeekLog,
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
    const programProgressPercent =
      weeklySessions > 0 ? Math.round((completedSessions / weeklySessions) * 100) : 0;
    const programWindow = activeProgram ? getProgramWindow(activeProgram) : null;
    const programStripValue = programWindow
      ? Math.round((programWindow.currentWeek / programWindow.durationWeeks) * 100)
      : programProgressPercent;
    const nutritionSummary =
      nutritionProfile !== null
        ? getNutritionDailySummary({
            profile: nutritionProfile,
            meals: dailyNutritionData.meals,
          })
        : null;
    const heroCopy = nextWorkout ? getHeroCopy(nextWorkout.state.state) : null;
    const weightValues = bodyWeightOverview.entries
      .slice()
      .reverse()
      .map((entry) => entry.weightKg);
    const quickLinks = [
      { href: "/program", label: "Programma", icon: ProgramIcon },
      { href: "/workout-history", label: "Storico", icon: HistoryIcon },
      { href: "/nutrition", label: "Nutrizione", icon: NutritionIcon },
      { href: "/body-weight", label: "Peso", icon: WeightIcon },
    ];

    return (
      <AppPage contentClassName="pb-4">
        <div className="space-y-4 pt-[62px]">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                {formatDashboardDate(now)}
              </p>
              <h1 className="mt-1 text-[30px] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--app-text)]">
                {getGreeting(user.name)}
              </h1>
            </div>
            <LogoutButton initial={getInitial(user.name)} />
          </header>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[13px] font-semibold text-[var(--app-muted)]">
                {getProgramHeadline(activeProgram)}
              </p>
              <p className="shrink-0 text-[13px] font-semibold text-[var(--app-muted-2)]">
                {programWindow
                  ? `Settimana ${programWindow.currentWeek} / ${programWindow.durationWeeks}`
                  : activeProgram
                    ? `${completedSessions}/${weeklySessions} sedute`
                    : "Inizia oggi"}
              </p>
            </div>
            <ProgressBar value={programStripValue} className="h-[5px]" />
          </section>

          <section>
            {activeProgram && nextWorkout && heroCopy ? (
              <AppCard className="rounded-[24px] px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--app-primary)] shadow-[0_0_10px_var(--app-primary)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-primary)]">
                    {heroCopy.badge}
                  </span>
                </div>
                <h2 className="mt-4 text-[25px] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--app-text)]">
                  {nextWorkout.workout.title}
                </h2>
                <p className="mt-1 text-[15px] text-[var(--app-muted)]">
                  {nextWorkout.workout.focus ?? "Seduta del programma"}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {nextWorkout.workout.estimatedMinutes ? (
                    <span className="app-pill">~{nextWorkout.workout.estimatedMinutes} min</span>
                  ) : null}
                  <span className="app-pill">
                    {nextWorkout.workout.exercises.length}{" "}
                    {nextWorkout.workout.exercises.length === 1 ? "esercizio" : "esercizi"}
                  </span>
                  <span className="app-pill">{nextWorkout.state.plannedDateLabel}</span>
                </div>
                <div className="mt-5">
                  <PrimaryButton href={`/workouts/${nextWorkout.workout.id}`}>
                    {heroCopy.cta}
                    <ArrowIcon />
                  </PrimaryButton>
                </div>
              </AppCard>
            ) : activeProgram ? (
              <AppCard className="rounded-[24px] px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--app-primary)] shadow-[0_0_10px_var(--app-primary)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-primary)]">
                    SETTIMANA COMPLETATA
                  </span>
                </div>
                <h2 className="mt-4 text-[25px] font-bold leading-[1.05] tracking-[-0.03em]">
                  Hai chiuso le sedute previste
                </h2>
                <p className="mt-2 text-[15px] text-[var(--app-muted)]">
                  Apri il programma per rivedere la settimana e preparare la prossima.
                </p>
                <div className="mt-5">
                  <PrimaryButton href="/program">
                    Apri programma
                    <ArrowIcon />
                  </PrimaryButton>
                </div>
              </AppCard>
            ) : (
              <AppCard className="rounded-[24px] px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--app-primary)] shadow-[0_0_10px_var(--app-primary)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-primary)]">
                    NUOVO PROGRAMMA
                  </span>
                </div>
                <h2 className="mt-4 text-[25px] font-bold leading-[1.05] tracking-[-0.03em]">
                  Crea il tuo programma
                </h2>
                <p className="mt-2 text-[15px] text-[var(--app-muted)]">
                  Completa il questionario per costruire il prossimo percorso.
                </p>
                <div className="mt-5">
                  <PrimaryButton href="/onboarding">
                    Completa questionario
                    <ArrowIcon />
                  </PrimaryButton>
                </div>
              </AppCard>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <CompactInfoCard title="Nutrizione oggi" href="/nutrition">
              {nutritionProfile && nutritionSummary && dailyNutritionData.meals.length > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <NutritionRing
                      progress={nutritionSummary.progressPercent}
                      centerValue={formatNumber(nutritionSummary.caloriesConsumed)}
                    />
                    <div className="min-w-0">
                      <p className="font-metrics text-[22px] font-semibold tracking-[-0.03em]">
                        {formatNumber(nutritionSummary.caloriesRemaining)}
                      </p>
                      <p className="text-[11px] text-[var(--app-muted)]">rimanenti</p>
                      <p className="mt-2 text-[11px] text-[var(--app-muted-2)]">
                        Target {formatNumber(nutritionSummary.calorieTarget)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--app-muted)]">Consumate</span>
                      <span className="font-semibold text-[var(--app-text)]">
                        {formatNumber(nutritionSummary.caloriesConsumed)} kcal
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--app-muted)]">Pasti oggi</span>
                      <span className="font-semibold text-[var(--app-text)]">
                        {dailyNutritionData.meals.length}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-[21px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                      Nessun pasto
                    </p>
                    <p className="text-[13px] leading-5 text-[var(--app-muted)]">
                      Aggiungi oggi
                    </p>
                  </div>
                  <div className="mt-auto pt-4 text-[12px] font-semibold text-[var(--app-primary)]">
                    Apri nutrizione
                  </div>
                </>
              )}
            </CompactInfoCard>

            <CompactInfoCard title="Peso" href="/body-weight">
              {bodyWeightOverview.summary.latestWeightKg !== null ? (
                <>
                  <div>
                    <p className="font-metrics text-[28px] font-semibold tracking-[-0.04em] text-[var(--app-text)]">
                      {formatWeight(bodyWeightOverview.summary.latestWeightKg)}
                      <span className="ml-1 text-[12px] font-medium text-[var(--app-muted)]">
                        kg
                      </span>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[var(--app-primary)]">
                        {formatDelta(bodyWeightOverview.summary.change7DaysKg) ?? "—"}
                      </span>
                      <span className="text-[11px] text-[var(--app-muted-2)]">7 giorni</span>
                    </div>
                  </div>
                  <Sparkline values={weightValues} />
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="font-metrics text-[28px] font-semibold tracking-[-0.04em] text-[var(--app-text)]">
                      —
                    </p>
                    <p className="text-[13px] leading-5 text-[var(--app-muted)]">
                      Registra peso
                    </p>
                  </div>
                  <div className="mt-auto pt-4 text-[12px] font-semibold text-[var(--app-primary)]">
                    Apri peso
                  </div>
                </>
              )}
            </CompactInfoCard>
          </section>

          <section>
            <Link href="/coach" className="block">
              <AppCard
                soft
                className="rounded-[20px] border-[var(--app-primary-border)] bg-[linear-gradient(120deg,rgba(208,216,43,0.1),rgba(208,216,43,0.03))] px-4 py-4 shadow-none transition hover:border-[rgba(208,216,43,0.36)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-[var(--app-primary)] text-[var(--app-bg)]">
                    <CoachIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-[var(--app-text)]">
                      Chiedi al coach
                    </p>
                    <p className="truncate text-[13px] text-[var(--app-muted)]">
                      Come sto andando questa settimana?
                    </p>
                  </div>
                  <span className="text-[var(--app-muted-2)]">
                    <ChevronIcon />
                  </span>
                </div>
              </AppCard>
            </Link>
          </section>

          <section className="pb-2">
            <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
              Collegamenti rapidi
            </p>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="app-card-soft flex min-h-[72px] items-center gap-3 rounded-[18px] border-white/8 px-4 py-4 text-sm font-semibold text-[var(--app-text)] transition hover:border-white/12 hover:bg-white/[0.05]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/6 text-[var(--app-primary)]">
                      <Icon />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <AppBottomNav />
      </AppPage>
    );
  } catch {
    return (
      <AppPage contentClassName="pb-4">
        <div className="space-y-4 pt-[62px]">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                {formatDashboardDate(now)}
              </p>
              <h1 className="mt-1 text-[30px] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--app-text)]">
                {getGreeting(user.name)}
              </h1>
            </div>
            <LogoutButton initial={getInitial(user.name)} />
          </header>

          <AppCard className="rounded-[24px] px-5 py-5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--app-primary)] shadow-[0_0_10px_var(--app-primary)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-primary)]">
                DASHBOARD
              </span>
            </div>
            <h2 className="mt-4 text-[24px] font-bold tracking-[-0.03em]">
              Impossibile caricare i dati
            </h2>
            <p className="mt-2 text-[15px] text-[var(--app-muted)]">
              Apri una delle sezioni principali e riprova tra poco.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/program"
                className="app-card-soft flex min-h-[72px] items-center rounded-[18px] px-4 py-4 text-sm font-semibold"
              >
                Programma
              </Link>
              <Link
                href="/nutrition"
                className="app-card-soft flex min-h-[72px] items-center rounded-[18px] px-4 py-4 text-sm font-semibold"
              >
                Nutrizione
              </Link>
            </div>
          </AppCard>
        </div>

        <AppBottomNav />
      </AppPage>
    );
  }
}
