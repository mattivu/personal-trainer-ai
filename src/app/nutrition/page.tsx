import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { MealEntryForm } from "@/components/nutrition/meal-entry-form";
import { MealEntryList } from "@/components/nutrition/meal-entry-list";
import { NutritionDateControls } from "@/components/nutrition/nutrition-date-controls";
import { calculateNutritionTargets } from "@/lib/nutrition/calculate-targets";
import { formatNutritionNumber } from "@/lib/nutrition/meals";
import {
  formatNutritionDateLabel,
  parseNutritionDateQuery,
} from "@/lib/nutrition/date";
import {
  getDailyActivityCaloriesEstimate,
  getDailyNutritionData,
  getMergedOnboardingAnswers,
  getNutritionDailySummary,
  getOrCreateNutritionProfile,
} from "@/lib/nutrition/profile";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const CALCULATION_METHOD_LABELS = {
  mifflin_st_jeor: "Mifflin-St Jeor",
  fallback_weight_based: "Fallback prudente basato sul peso",
  fallback_default: "Fallback prudente con dati limitati",
} as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function getConfidenceLabel(confidence: "low" | "medium" | "high") {
  switch (confidence) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
    default:
      return "Bassa";
  }
}

type NutritionPageProps = {
  searchParams: Promise<{
    date?: string | string[];
  }>;
};

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

  const [answers, userProfile, nutritionProfileResult, dailyData, activityEstimate] =
    await Promise.all([
      getMergedOnboardingAnswers(user.id),
      prisma.userProfile.findUnique({
        where: {
          userId: user.id,
        },
      }),
      getOrCreateNutritionProfile(user.id),
      getDailyNutritionData(user.id, selectedDate.dateKey),
      getDailyActivityCaloriesEstimate(user.id, selectedDate.dateKey),
    ]);

  const calculation = calculateNutritionTargets({
    answers,
    profile: userProfile,
  });
  const nutritionProfile = nutritionProfileResult.profile;
  const dailySummary = getNutritionDailySummary({
    profile: nutritionProfile,
    meals: dailyData.meals,
    estimatedActivityCalories: activityEstimate.totalEstimatedActivityCalories,
  });

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-8 pb-28 text-white">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="mt-2 text-3xl font-bold">Nutrizione</h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              Stime e registrazioni manuali orientative per tenere traccia della
              giornata.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100"
          >
            Torna alla dashboard
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/body-weight"
            className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100"
          >
            Apri peso corporeo
          </Link>
          <Link
            href="/nutrition/weekly-review"
            className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100"
          >
            Apri revisione nutrizionale
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Target giornaliero indicativo
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-4xl font-bold">
                {formatNumber(nutritionProfile.calorieTarget)} kcal
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                Fabbisogno indicativo stimato:{" "}
                {formatNumber(nutritionProfile.estimatedTdee)} kcal
              </p>
            </div>

            <p className="max-w-md text-sm text-neutral-500">
              Le stime sono orientative e non sostituiscono un professionista.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Proteine</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(nutritionProfile.proteinTarget)} g
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Carboidrati</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(nutritionProfile.carbsTarget)} g
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Grassi</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(nutritionProfile.fatTarget)} g
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100">
            <p className="font-semibold">Macro indicativi</p>
            <p className="mt-2">
              Metodo:{" "}
              {CALCULATION_METHOD_LABELS[
                nutritionProfile.calculationMethod as keyof typeof CALCULATION_METHOD_LABELS
              ] ?? "Stima prudente"}.
              {" "}I target sono una base orientativa, non una dieta personalizzata.
            </p>
            {calculation.warnings.length > 0 ? (
              <div className="mt-3 space-y-2 text-amber-50/90">
                {calculation.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                Diario pasti
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">
                  Diario del {formatNutritionDateLabel(dailyData.date)}
                </h2>
                {selectedDate.isToday ? (
                  <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    Oggi
                  </span>
                ) : null}
              </div>
            </div>

            <p className="text-sm text-neutral-500">
              Calorie registrate: {formatNutritionNumber(dailySummary.registered.calories)} kcal
            </p>
          </div>

          {selectedDate.message ? (
            <div className="mt-4 rounded-2xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
              {selectedDate.message}
            </div>
          ) : null}

          <div className="mt-5">
            <NutritionDateControls selectedDate={dailyData.date} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Calorie registrate</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNutritionNumber(dailySummary.caloriesConsumed)} kcal
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Calorie rimanenti</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(dailySummary.caloriesRemaining)} kcal
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-neutral-400">
              <span>Avanzamento calorie</span>
              <span>{formatNumber(dailySummary.progressPercent)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${dailySummary.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Proteine registrate</p>
              <p className="mt-2 text-xl font-semibold">
                {formatNutritionNumber(dailySummary.registered.protein)} g
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Carboidrati registrati</p>
              <p className="mt-2 text-xl font-semibold">
                {formatNutritionNumber(dailySummary.registered.carbs)} g
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Grassi registrati</p>
              <p className="mt-2 text-xl font-semibold">
                {formatNutritionNumber(dailySummary.registered.fat)} g
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-sky-900/50 bg-sky-950/20 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-200/70">
                Attivita del giorno
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {formatNumber(dailySummary.estimatedActivityCalories)} kcal stimate
              </h2>
            </div>

            <p className="max-w-md text-sm text-sky-50/80">
              Bilancio indicativo includendo attivita:{" "}
              {formatNumber(dailySummary.caloriesRemainingIncludingActivity)} kcal
            </p>
          </div>

          <p className="mt-4 text-sm text-sky-50/80">
            Le calorie attivita sono una stima. Non usarle come valore preciso da
            recuperare automaticamente con il cibo.
          </p>

          {activityEstimate.activities.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-sky-900/40 bg-neutral-950/60 p-4 text-sm text-neutral-300">
              Nessuna attivita registrata per questo giorno.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {activityEstimate.activities.map((activity, index) => (
                <article
                  key={`${activity.workoutName}-${index}`}
                  className="rounded-2xl border border-sky-900/40 bg-neutral-950/70 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{activity.workoutName}</h3>
                      <p className="mt-2 text-sm text-neutral-300">
                        {activity.explanation}
                      </p>
                    </div>

                    <div className="min-w-48 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                      <p className="text-sm text-neutral-500">Stima attivita</p>
                      <p className="mt-2 text-xl font-semibold text-white">
                        {formatNumber(activity.estimatedCalories)} kcal
                      </p>
                      <p className="mt-2 text-sm text-neutral-400">
                        {formatNumber(activity.estimatedDurationMinutes)} min · MET{" "}
                        {activity.met.toFixed(1)}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Affidabilita {getConfidenceLabel(activity.confidence)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-5 text-xs text-sky-50/65">{activityEstimate.disclaimer}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Pasti del giorno</h2>
            <span className="text-sm text-neutral-500">
              {dailyData.meals.length} registrati
            </span>
          </div>

          <div className="mt-5">
            <MealEntryList meals={dailyData.meals} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">Aggiungi pasto</h2>
          <p className="mt-3 text-sm text-neutral-400">
            Inserisci alimento o pasto, quantità e usa la stima AI. I valori nutrizionali restano modificabili nella sezione secondaria.
          </p>
          <div className="mt-5">
            <MealEntryForm date={dailyData.date} />
          </div>
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}
