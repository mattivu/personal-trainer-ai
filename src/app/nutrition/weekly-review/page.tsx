import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import {
  getNutritionWeeklyReviewForUser,
  type NutritionWeeklyReviewStatus,
} from "@/lib/nutrition/weekly-review";
import { getBodyWeightTrendLabel, formatBodyWeightDelta } from "@/lib/body-weight";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatItalianDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatSignedKcal(value: number) {
  if (value === 0) {
    return "0 kcal";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value)} kcal`;
}

function formatWeight(value: number | null) {
  if (value === null) {
    return "Dati insufficienti";
  }

  return `${formatNumber(value, 1)} kg`;
}

function getStatusClasses(status: NutritionWeeklyReviewStatus) {
  switch (status) {
    case "Settimana coerente":
      return "border-emerald-700 bg-emerald-950/40 text-emerald-200";
    case "Buona continuita":
      return "border-sky-700 bg-sky-950/40 text-sky-200";
    case "Proteine da migliorare":
      return "border-amber-700 bg-amber-950/40 text-amber-200";
    case "Calorie poco controllate":
      return "border-rose-700 bg-rose-950/40 text-rose-200";
    case "Target da osservare":
      return "border-neutral-700 bg-neutral-900 text-neutral-200";
    case "Dati insufficienti":
    default:
      return "border-neutral-700 bg-neutral-900 text-neutral-200";
  }
}

export default async function NutritionWeeklyReviewPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const review = await getNutritionWeeklyReviewForUser(user.id);
  const weekLabel = `${formatItalianDate(review.week.start)} - ${formatItalianDate(review.week.end)}`;

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 pb-28 text-white sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="mt-3 text-3xl font-bold">Revisione nutrizionale</h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              Vista settimanale semplice per confrontare calorie, macro, attivita
              stimata e andamento peso con il target indicativo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/nutrition"
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Nutrizione
            </Link>
            <Link
              href="/body-weight"
              className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100"
            >
              Peso corporeo
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-neutral-500">Settimana analizzata</p>
              <h2 className="mt-2 text-2xl font-semibold">{weekLabel}</h2>
              <p className="mt-3 text-sm text-neutral-400">
                Giorni analizzati: {review.metrics.daysAnalyzed} su 7
              </p>
            </div>

            <div
              className={`inline-flex rounded-xl border px-4 py-2 text-sm font-semibold ${getStatusClasses(review.status)}`}
            >
              {review.status}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Calorie medie</p>
            <p className="mt-2 text-3xl font-bold">
              {formatNumber(review.metrics.averageCaloriesConsumed)} kcal
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              target medio {formatNumber(review.metrics.averageCalorieTarget)} kcal
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Proteine medie</p>
            <p className="mt-2 text-3xl font-bold">
              {formatNumber(review.metrics.averageProtein)} g
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              carboidrati {formatNumber(review.metrics.averageCarbs)} g, grassi{" "}
              {formatNumber(review.metrics.averageFat)} g
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Giorni registrati</p>
            <p className="mt-2 text-3xl font-bold">{review.metrics.daysWithMeals}</p>
            <p className="mt-2 text-sm text-neutral-400">
              {review.metrics.totalMeals} pasti registrati
            </p>
          </div>

          <div className="rounded-2xl border border-sky-900/50 bg-sky-950/20 p-5">
            <p className="text-sm text-sky-100/70">Bilancio indicativo</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {formatSignedKcal(review.metrics.averageIndicativeBalance)}
            </p>
            <p className="mt-2 text-sm text-sky-50/80">
              include attivita stimata media di{" "}
              {formatNumber(review.metrics.averageEstimatedActivityCalories)} kcal
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Differenza media</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatSignedKcal(review.metrics.averageCalorieDifference)}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              rispetto al target calorie
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Attivita stimata</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(review.metrics.totalEstimatedActivityCalories)} kcal
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              media {formatNumber(review.metrics.averageEstimatedActivityCalories)} kcal al giorno
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Trend peso</p>
            <p className="mt-2 text-2xl font-semibold">
              {getBodyWeightTrendLabel(review.metrics.weightTrend)}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              ultimo peso {formatWeight(review.metrics.latestWeightKg)} · 7 giorni{" "}
              {formatBodyWeightDelta(review.metrics.weightChange7DaysKg)}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Giorni sopra target</p>
            <p className="mt-2 text-2xl font-semibold">{review.metrics.daysAboveTarget}</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Giorni sotto target</p>
            <p className="mt-2 text-2xl font-semibold">{review.metrics.daysBelowTarget}</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Molto sotto target</p>
            <p className="mt-2 text-2xl font-semibold">{review.metrics.daysFarBelowTarget}</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-sm text-neutral-500">Molto sopra target</p>
            <p className="mt-2 text-2xl font-semibold">{review.metrics.daysFarAboveTarget}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">Segnali rilevati</h2>
            {review.signals.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">Dati insufficienti.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-neutral-200">
                {review.signals.map((signal) => (
                  <li
                    key={signal}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                  >
                    {signal}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Stime AI sui pasti</p>
              <p className="mt-2 text-lg font-semibold">
                {review.metrics.aiEstimatedMealPercent === null
                  ? "Dati insufficienti"
                  : `${formatNumber(review.metrics.aiEstimatedMealPercent)}%`}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">Raccomandazione</h2>
            <p className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-medium text-neutral-100">
              {review.recommendation}
            </p>

            {review.cautionMessage ? (
              <p className="mt-5 rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
                {review.cautionMessage}
              </p>
            ) : null}

            <p className="mt-5 text-sm text-neutral-400">
              Questa revisione e indicativa e non sostituisce un professionista.
            </p>
          </div>
        </section>
      </section>

      <AppBottomNav />
    </main>
  );
}
