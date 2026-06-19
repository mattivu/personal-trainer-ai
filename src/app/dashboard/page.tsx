import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppBadge } from "@/components/ui/app-badge";
import { AppCard } from "@/components/ui/app-card";
import { AppPage } from "@/components/ui/app-page";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PrimaryButton, SecondaryButton } from "@/components/ui/buttons";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { getBodyWeightOverviewForUser, getBodyWeightTrendLabel } from "@/lib/body-weight";
import {
  getDailyNutritionData,
  getNutritionDailySummary,
} from "@/lib/nutrition/profile";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getFlexibleWorkoutState, getWeekEnd, getWeekStart, getWorkoutScheduleForProgram } from "@/lib/workout-schedule";
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
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
    Math.ceil((Date.now() - startedAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
  );

  return {
    currentWeek: Math.min(elapsedWeeks, program.durationWeeks),
    durationWeeks: program.durationWeeks,
  };
}

function getProgramStatusLabel(completed: number, total: number) {
  if (total === 0) {
    return "Programma da completare";
  }

  if (completed >= total) {
    return "Settimana completata";
  }

  const remaining = Math.max(total - completed, 0);
  return `${remaining} ${remaining === 1 ? "seduta da fare" : "sedute da fare"}`;
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
        badge: "Seduta in corso",
        cta: "Apri seduta",
      };
    case "recommended_today":
      return {
        badge: "Prossima seduta · Oggi",
        cta: "Inizia seduta",
      };
    case "overdue":
    case "skipped":
      return {
        badge: "Prossima seduta · Da recuperare",
        cta: "Apri seduta",
      };
    case "future_available":
    default:
      return {
        badge: "Prossima seduta",
        cta: "Apri seduta",
      };
  }
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

function SparkIcon() {
  return <span className="inline-block h-2 w-2 rounded-full bg-[var(--app-primary)] shadow-[0_0_10px_var(--app-primary)]" />;
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
      (entry) => entry.state.state === "completed"
    ).length;
    const weeklySessions = activeWorkouts.length;
    const programProgressPercent =
      weeklySessions > 0 ? Math.round((completedSessions / weeklySessions) * 100) : 0;
    const programWindow = activeProgram ? getProgramWindow(activeProgram) : null;
    const nutritionSummary =
      nutritionProfile !== null
        ? getNutritionDailySummary({
            profile: nutritionProfile,
            meals: dailyNutritionData.meals,
          })
        : null;
    const heroCopy = nextWorkout ? getHeroCopy(nextWorkout.state.state) : null;

    return (
      <AppPage>
        <PageHeader
          eyebrow={formatDashboardDate(now)}
          title={getGreeting(user.name)}
          description="Ecco cosa puoi fare oggi."
          action={<LogoutButton />}
          meta={
            activeProgram ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--app-muted)]">{activeProgram.title}</span>
                  <span className="text-[var(--app-muted-2)]">
                    {programWindow
                      ? `Settimana ${programWindow.currentWeek} / ${programWindow.durationWeeks}`
                      : getProgramStatusLabel(completedSessions, weeklySessions)}
                  </span>
                </div>
                <ProgressBar value={programWindow ? Math.round((programWindow.currentWeek / programWindow.durationWeeks) * 100) : programProgressPercent} />
              </div>
            ) : null
          }
        />

        <section className="app-section">
          {activeProgram && nextWorkout && heroCopy ? (
            <AppCard>
              <div className="flex items-center gap-2">
                <SparkIcon />
                <AppBadge tone="accent" className="border-0 bg-transparent px-0 py-0 text-[var(--app-primary)]">
                  {heroCopy.badge}
                </AppBadge>
              </div>
              <h2 className="mt-4 text-[28px] font-bold tracking-[-0.03em] text-[var(--app-text)]">
                {nextWorkout.workout.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
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
              <div className="mt-6">
                <PrimaryButton href={`/workouts/${nextWorkout.workout.id}`}>
                  {heroCopy.cta}
                  <ArrowIcon />
                </PrimaryButton>
              </div>
            </AppCard>
          ) : activeProgram ? (
            <AppCard>
              <AppBadge tone="accent">Settimana completata</AppBadge>
              <h2 className="mt-4 text-[28px] font-bold tracking-[-0.03em]">
                Hai chiuso le sedute previste
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                Apri il programma per rivedere la settimana e preparare la prossima seduta.
              </p>
              <div className="mt-6">
                <PrimaryButton href="/program">
                  Apri programma
                  <ArrowIcon />
                </PrimaryButton>
              </div>
            </AppCard>
          ) : (
            <AppCard>
              <AppBadge tone="accent">Nuovo programma</AppBadge>
              <h2 className="mt-4 text-[28px] font-bold tracking-[-0.03em]">
                Crea il tuo programma
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                Rispondi al questionario per costruire un programma adatto al tuo obiettivo.
              </p>
              <div className="mt-6">
                <PrimaryButton href="/onboarding">
                  Completa questionario
                  <ArrowIcon />
                </PrimaryButton>
              </div>
            </AppCard>
          )}
        </section>

        <section className="app-section">
          <SectionHeader title="Riepilogo programma" eyebrow="Allenamento" />
          {activeProgram ? (
            <AppCard soft>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Sedute settimanali"
                  value={weeklySessions}
                  hint={activeProgram.goal ?? "Programma attivo"}
                />
                <StatCard
                  label="Sedute completate"
                  value={completedSessions}
                  hint={getProgramStatusLabel(completedSessions, weeklySessions)}
                  accent={completedSessions > 0}
                />
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[var(--app-muted)]">Avanzamento settimana</span>
                  <span className="text-[var(--app-muted-2)]">{programProgressPercent}%</span>
                </div>
                <ProgressBar value={programProgressPercent} />
              </div>
              <div className="mt-5">
                <SecondaryButton href="/program">Apri programma</SecondaryButton>
              </div>
            </AppCard>
          ) : (
            <EmptyState
              title="Nessun programma attivo"
              description="Completa il questionario per creare il tuo programma."
              action={<SecondaryButton href="/onboarding">Completa questionario</SecondaryButton>}
            />
          )}
        </section>

        <section className="app-section">
          <SectionHeader title="Nutrizione oggi" eyebrow="Riepilogo giornaliero" />
          {nutritionProfile && nutritionSummary ? (
            <AppCard soft>
              {dailyNutritionData.meals.length > 0 ? (
                <>
                  <div className="grid grid-cols-[1.2fr_0.8fr] gap-3">
                    <StatCard
                      label="Target calorie"
                      value={`${formatNumber(nutritionSummary.calorieTarget)}`}
                      hint="kcal"
                    />
                    <StatCard
                      label="Calorie registrate"
                      value={`${formatNumber(nutritionSummary.caloriesConsumed)}`}
                      hint={`${formatNumber(nutritionSummary.caloriesRemaining)} kcal rimanenti`}
                      accent={nutritionSummary.caloriesConsumed > 0}
                    />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <StatCard
                      label="Proteine"
                      value={`${formatNumber(nutritionSummary.registered.protein)}g`}
                      hint={`su ${formatNumber(nutritionProfile.proteinTarget)}g`}
                    />
                    <StatCard
                      label="Carboidrati"
                      value={`${formatNumber(nutritionSummary.registered.carbs)}g`}
                      hint={`su ${formatNumber(nutritionProfile.carbsTarget)}g`}
                    />
                    <StatCard
                      label="Grassi"
                      value={`${formatNumber(nutritionSummary.registered.fat)}g`}
                      hint={`su ${formatNumber(nutritionProfile.fatTarget)}g`}
                    />
                  </div>
                  <div className="mt-5">
                    <SecondaryButton href="/nutrition">Apri nutrizione</SecondaryButton>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="Nessun pasto registrato"
                  description="Registra qualche pasto per vedere il riepilogo nutrizionale."
                  action={<SecondaryButton href="/nutrition">Aggiungi pasto</SecondaryButton>}
                />
              )}
            </AppCard>
          ) : (
            <EmptyState
              title="Nutrizione da impostare"
              description="Registra qualche pasto per vedere il riepilogo nutrizionale."
              action={<SecondaryButton href="/nutrition">Apri nutrizione</SecondaryButton>}
            />
          )}
        </section>

        <section className="app-section">
          <SectionHeader title="Peso corporeo" eyebrow="Andamento" />
          {bodyWeightOverview.summary.latestWeightKg !== null ? (
            <AppCard soft>
              <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
                <StatCard
                  label="Ultimo peso"
                  value={
                    <>
                      {formatWeight(bodyWeightOverview.summary.latestWeightKg)}
                      <span className="ml-1 text-sm font-medium text-[var(--app-muted)]">kg</span>
                    </>
                  }
                />
                <StatCard
                  label="Trend"
                  value={getBodyWeightTrendLabel(bodyWeightOverview.summary.trend)}
                  hint={
                    bodyWeightOverview.summary.change7DaysKg !== null
                      ? `${formatDelta(bodyWeightOverview.summary.change7DaysKg)} in 7 giorni`
                      : "Aggiungi altre pesate per vedere meglio l'andamento"
                  }
                  accent={bodyWeightOverview.summary.trend !== "dati_insufficienti"}
                />
              </div>
              <div className="mt-5">
                <SecondaryButton href="/body-weight">Registra peso</SecondaryButton>
              </div>
            </AppCard>
          ) : (
            <EmptyState
              title="Nessun peso registrato"
              description="Aggiungi il peso per seguire l'andamento."
              action={<SecondaryButton href="/body-weight">Registra peso</SecondaryButton>}
            />
          )}
        </section>

        <section className="app-section">
          <SectionHeader title="Coach" eyebrow="Supporto" />
          <AppCard soft className="border-[var(--app-primary-border)] bg-[linear-gradient(120deg,rgba(208,216,43,0.1),rgba(208,216,43,0.03))]">
            <p className="max-w-[34rem] text-sm leading-6 text-[var(--app-text)]">
              Chiedi al coach un consiglio su allenamento, nutrizione, peso o recupero.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
              Completa qualche seduta per ricevere indicazioni piu precise.
            </p>
            <div className="mt-5">
              <PrimaryButton href="/coach">
                Apri coach
                <ArrowIcon />
              </PrimaryButton>
            </div>
          </AppCard>
        </section>

        <section className="app-section pb-4">
          <SectionHeader title="Collegamenti rapidi" eyebrow="Vai a" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/program", label: "Programma" },
              { href: "/nutrition", label: "Nutrizione" },
              { href: "/workout-history", label: "Storico" },
              { href: "/weekly-review", label: "Revisione programma" },
              { href: "/nutrition/weekly-review", label: "Revisione nutrizionale" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="app-card-soft flex min-h-[84px] items-center rounded-[20px] px-4 py-4 text-sm font-semibold text-[var(--app-text)] transition hover:border-white/14 hover:bg-white/[0.05]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <AppBottomNav />
      </AppPage>
    );
  } catch {
    return (
      <AppPage>
        <PageHeader
          eyebrow={formatDashboardDate(now)}
          title={getGreeting(user.name)}
          description="Ecco cosa puoi fare oggi."
          action={<LogoutButton />}
        />

        <section className="app-section">
          <EmptyState
            title="Impossibile caricare la dashboard"
            description="Ricarica la pagina tra qualche istante. Le altre sezioni dell'app restano disponibili."
            action={<PrimaryButton href="/program">Apri programma</PrimaryButton>}
          />
        </section>

        <section className="app-section">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/nutrition"
              className="app-card-soft flex min-h-[84px] items-center rounded-[20px] px-4 py-4 text-sm font-semibold"
            >
              Apri nutrizione
            </Link>
            <Link
              href="/coach"
              className="app-card-soft flex min-h-[84px] items-center rounded-[20px] px-4 py-4 text-sm font-semibold"
            >
              Apri coach
            </Link>
          </div>
        </section>

        <AppBottomNav />
      </AppPage>
    );
  }
}
