import type { MealEntry, MealType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { MealEntryFullscreen } from "@/components/nutrition/meal-entry-fullscreen";
import { MealEntryList } from "@/components/nutrition/meal-entry-list";
import { MealMomentCard } from "@/components/nutrition/meal-moment-card";
import { NutritionDateControls } from "@/components/nutrition/nutrition-date-controls";
import { NutritionSummaryCard } from "@/components/nutrition/nutrition-summary-card";
import { AppBadge } from "@/components/ui/app-badge";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton, SecondaryButton } from "@/components/ui/buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { AppPage } from "@/components/ui/app-page";
import { SectionHeader } from "@/components/ui/section-header";
import { MEAL_TYPE_OPTIONS } from "@/lib/nutrition/meals";
import {
  formatNutritionDateLabel,
  parseNutritionDateQuery,
} from "@/lib/nutrition/date";
import {
  getDailyActivityCaloriesEstimate,
  getDailyNutritionData,
  getNutritionDailySummary,
  getOrCreateNutritionProfile,
} from "@/lib/nutrition/profile";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type NutritionPageProps = {
  searchParams: Promise<{
    date?: string | string[];
    meal?: string | string[];
    add?: string | string[];
  }>;
};

const PRIMARY_MEAL_TYPES = MEAL_TYPE_OPTIONS.filter(
  (option) => option.value !== "other"
);

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function formatShortDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Rome",
  })
    .format(new Date(`${dateKey}T12:00:00Z`))
    .replace(".", "")
    .replace(/^./, (value) => value.toUpperCase());
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getInitialMealType(value: string | string[] | undefined): MealType {
  const singleValue = getSingleSearchParam(value);

  if (
    singleValue &&
    MEAL_TYPE_OPTIONS.some((option) => option.value === singleValue)
  ) {
    return singleValue as MealType;
  }

  return "breakfast";
}

function buildNutritionHref(
  date: string,
  mealType?: MealType,
  addMeal = false
) {
  const params = new URLSearchParams();

  if (date) {
    params.set("date", date);
  }

  if (mealType) {
    params.set("meal", mealType);
  }

  if (addMeal) {
    params.set("add", "1");
  }

  const query = params.toString();

  return `/nutrition${query ? `?${query}` : ""}`;
}

function getMealsForType(meals: MealEntry[], mealType: MealType) {
  return meals.filter((meal) => meal.mealType === mealType);
}

function getRemainingStatusNote(remainingCalories: number, activityCalories: number) {
  if (remainingCalories < 0) {
    return `Hai superato il riferimento di ${formatNumber(Math.abs(remainingCalories))} kcal.`;
  }

  if (activityCalories > 0) {
    return "Il riepilogo include anche l'attività stimata della giornata.";
  }

  return "Valori orientativi per tenere il diario semplice e immediato.";
}

export default async function NutritionPage({ searchParams }: NutritionPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const resolvedSearchParams = await searchParams;
  const selectedDate = parseNutritionDateQuery(resolvedSearchParams.date);
  const initialMealType = getInitialMealType(resolvedSearchParams.meal);
  const isMealEntryOpen = getSingleSearchParam(resolvedSearchParams.add) === "1";

  try {
    const [userProfile, nutritionProfileResult, dailyData, activityEstimate] =
      await Promise.all([
        prisma.userProfile.findUnique({
          where: {
            userId: user.id,
          },
        }),
        getOrCreateNutritionProfile(user.id),
        getDailyNutritionData(user.id, selectedDate.dateKey),
        getDailyActivityCaloriesEstimate(user.id, selectedDate.dateKey),
      ]);

    const nutritionProfile = nutritionProfileResult.profile;
    const dailySummary = getNutritionDailySummary({
      profile: nutritionProfile,
      meals: dailyData.meals,
      estimatedActivityCalories: activityEstimate.totalEstimatedActivityCalories,
    });

    const adjustedTarget =
      dailySummary.calorieTarget + dailySummary.estimatedActivityCalories;
    const calorieProgressPercent =
      adjustedTarget > 0
        ? Math.min((dailySummary.caloriesConsumed / adjustedTarget) * 100, 100)
        : 0;
    const remainingCalories = dailySummary.caloriesRemainingIncludingActivity;
    const macroSummaries = [
      {
        label: "Carboidrati",
        consumed: dailySummary.registered.carbs,
        target: nutritionProfile.carbsTarget,
      },
      {
        label: "Proteine",
        consumed: dailySummary.registered.protein,
        target: nutritionProfile.proteinTarget,
      },
      {
        label: "Grassi",
        consumed: dailySummary.registered.fat,
        target: nutritionProfile.fatTarget,
      },
    ];
    const hasMeals = dailyData.meals.length > 0;
    const reviewHref = "/nutrition/weekly-review";
    const weightHref = "/body-weight";

    return (
      <AppPage className="pb-28 pt-6">
        <section className="space-y-6">
          <header className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--app-muted-2)]">
                  Nutrizione
                </p>
                <h1 className="mt-2 text-[40px] font-semibold tracking-[-0.05em] text-[var(--app-text)]">
                  {selectedDate.isToday ? "Oggi" : formatShortDateLabel(dailyData.date)}
                </h1>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  {formatNutritionDateLabel(dailyData.date)}
                </p>
              </div>

              <Link
                href={reviewHref}
                className="inline-flex min-h-10 items-center rounded-full border border-[var(--app-border)] bg-white/[0.03] px-4 text-sm font-semibold text-[var(--app-text)]"
              >
                Revisione
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedDate.isToday ? <AppBadge tone="accent">Oggi</AppBadge> : null}
              <AppBadge>Target {formatNumber(nutritionProfile.calorieTarget)} kcal</AppBadge>
              {dailySummary.estimatedActivityCalories > 0 ? (
                <AppBadge>
                  Attività {formatNumber(dailySummary.estimatedActivityCalories)} kcal
                </AppBadge>
              ) : null}
            </div>

            {selectedDate.message ? (
              <AppCard className="p-4 text-sm text-amber-100">
                <div className="rounded-[18px] border border-amber-700/40 bg-amber-950/30 px-4 py-3">
                  {selectedDate.message}
                </div>
              </AppCard>
            ) : null}

            <NutritionDateControls selectedDate={dailyData.date} />
          </header>

          <NutritionSummaryCard
            consumedCalories={dailySummary.caloriesConsumed}
            remainingCalories={Math.max(remainingCalories, 0)}
            activityCalories={dailySummary.estimatedActivityCalories}
            targetCalories={nutritionProfile.calorieTarget}
            progressPercent={calorieProgressPercent}
            macroSummaries={macroSummaries}
            statusNote={getRemainingStatusNote(
              remainingCalories,
              dailySummary.estimatedActivityCalories
            )}
          />

          <AppCard className="p-4">
            <SectionHeader
              eyebrow="Diario pasti"
              title="Alimentazione"
              action={
                <Link
                  href={buildNutritionHref(dailyData.date, initialMealType, true)}
                  scroll={false}
                  className="text-sm font-semibold text-[var(--app-primary)]"
                >
                  Aggiungi
                </Link>
              }
            />

            <div className="mt-4 space-y-3">
              {PRIMARY_MEAL_TYPES.map((option) => (
                <MealMomentCard
                  key={option.value}
                  mealType={option.value}
                  label={option.label}
                  meals={getMealsForType(dailyData.meals, option.value)}
                  href={buildNutritionHref(dailyData.date, option.value, true)}
                />
              ))}

              {getMealsForType(dailyData.meals, "other").length > 0 ? (
                <MealMomentCard
                  mealType="other"
                  label="Altro"
                  meals={getMealsForType(dailyData.meals, "other")}
                  href={buildNutritionHref(dailyData.date, "other", true)}
                />
              ) : null}
            </div>
          </AppCard>

          <AppCard className="p-4">
            <SectionHeader eyebrow="Azioni rapide" title="Aggiungi in fretta" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PrimaryButton href={buildNutritionHref(dailyData.date, initialMealType, true)}>
                Aggiungi pasto
              </PrimaryButton>
              <SecondaryButton href={buildNutritionHref(dailyData.date, initialMealType, true)}>
                Stima con AI
              </SecondaryButton>
            </div>
          </AppCard>

          <div className="grid gap-3">
            <AppCard className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
                Attività stimata
              </p>
              <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                Attività stimata dagli allenamenti
              </h2>
              <p className="font-metrics mt-3 text-[32px] font-semibold tracking-[-0.05em] text-[var(--app-text)]">
                {formatNumber(dailySummary.estimatedActivityCalories)} kcal
              </p>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                Indicazione utile per leggere meglio la giornata, senza usare
                l'attività come compensazione automatica.
              </p>
              {activityEstimate.activities.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {activityEstimate.activities.slice(0, 3).map((activity, index) => (
                    <AppBadge key={`${activity.workoutName}-${index}`}>
                      {activity.workoutName} · {formatNumber(activity.estimatedCalories)} kcal
                    </AppBadge>
                  ))}
                </div>
              ) : null}
            </AppCard>

            <div className="grid gap-3 sm:grid-cols-2">
              <AppCard className="p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
                  Revisione nutrizionale
                </p>
                <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                  Controlla i target
                </h2>
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  Controlla se i tuoi target sono ancora adatti al tuo andamento.
                </p>
                <div className="mt-4">
                  <SecondaryButton href={reviewHref}>Apri revisione</SecondaryButton>
                </div>
              </AppCard>

              <AppCard className="p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
                  Peso corporeo
                </p>
                <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                  Tieni d'occhio l'andamento
                </h2>
                <div className="mt-4 grid gap-3">
                  <SecondaryButton href={weightHref}>Registra peso</SecondaryButton>
                  <SecondaryButton href={weightHref}>Andamento peso</SecondaryButton>
                </div>
              </AppCard>
            </div>
          </div>

          <AppCard className="p-4">
            <SectionHeader
              eyebrow="Dettagli"
              title="Pasti registrati"
              action={
                <span className="text-sm text-[var(--app-muted)]">
                  {hasMeals ? `${dailyData.meals.length} voci` : "Nessuna voce"}
                </span>
              }
            />
            <div className="mt-4">
              {hasMeals ? (
                <MealEntryList meals={dailyData.meals} />
              ) : (
                <EmptyState
                  title="Nessun pasto oggi"
                  description="La dashboard è pronta: aggiungi il primo pasto per vedere riepilogo e macro aggiornarsi."
                />
              )}
            </div>
          </AppCard>

          {!userProfile ? (
            <EmptyState
              title="Configura la nutrizione"
              description="Completa i dati iniziali per calcolare un target orientativo."
              action={<PrimaryButton href="/onboarding">Completa dati</PrimaryButton>}
            />
          ) : null}
        </section>

        <MealEntryFullscreen
          key={`${dailyData.date}-${initialMealType}-${isMealEntryOpen ? "open" : "closed"}`}
          open={isMealEntryOpen}
          date={dailyData.date}
          mealType={initialMealType}
          closeHref={buildNutritionHref(dailyData.date)}
        />

        <AppBottomNav />
      </AppPage>
    );
  } catch {
    return (
      <AppPage className="pb-28 pt-6">
        <EmptyState
          title="Non siamo riusciti a caricare la nutrizione."
          description="Riprova tra poco."
        />
        <AppBottomNav />
      </AppPage>
    );
  }
}
