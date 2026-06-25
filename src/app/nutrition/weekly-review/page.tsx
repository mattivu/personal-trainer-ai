import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { AdaptiveReviewCard } from "@/components/nutrition/adaptive-review-card";
import { AppBadge } from "@/components/ui/app-badge";
import { AppCard } from "@/components/ui/app-card";
import { AppPage } from "@/components/ui/app-page";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SecondaryButton } from "@/components/ui/buttons";
import {
  formatBodyWeightDelta,
  getBodyWeightTrendLabel,
} from "@/lib/body-weight";
import { buildAdaptiveNutritionReview } from "@/lib/nutrition/adaptive-engine";
import {
  getNutritionWeeklyReviewForUser,
  type NutritionWeeklyReviewStatus,
} from "@/lib/nutrition/weekly-review";
import { getOrCreateNutritionProfile } from "@/lib/nutrition/profile";
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

function formatPercent(value: number | null, digits = 0) {
  if (value === null) {
    return "—";
  }

  return `${formatNumber(value, digits)}%`;
}

function formatWeight(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${formatNumber(value, 1)} kg`;
}

function formatCompactWeightDelta(value: number | null) {
  if (value === null) {
    return "—";
  }

  return formatBodyWeightDelta(value);
}

function getStatusTone(status: NutritionWeeklyReviewStatus) {
  switch (status) {
    case "Settimana coerente":
    case "Buona continuita":
      return "accent" as const;
    case "Proteine da migliorare":
      return "warning" as const;
    case "Calorie poco controllate":
    case "Target da osservare":
    case "Dati insufficienti":
    default:
      return "neutral" as const;
  }
}

function getGeneralStateMessage(input: {
  recommendation: string;
  cautionMessage: string | null;
}) {
  if (input.cautionMessage) {
    return input.cautionMessage;
  }

  return input.recommendation;
}

function getWeightSummary(review: Awaited<ReturnType<typeof getNutritionWeeklyReviewForUser>>) {
  if (review.metrics.weightChange7DaysKg !== null) {
    return formatBodyWeightDelta(review.metrics.weightChange7DaysKg);
  }

  return formatWeight(review.metrics.latestWeightKg);
}

export default async function NutritionWeeklyReviewPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const [review, adaptiveReview, nutritionProfileResult] = await Promise.all([
    getNutritionWeeklyReviewForUser(user.id),
    buildAdaptiveNutritionReview(user.id),
    getOrCreateNutritionProfile(user.id),
  ]);

  const nutritionProfile = nutritionProfileResult.profile;
  const isInsufficientData =
    review.status === "Dati insufficienti" ||
    adaptiveReview.status === "insufficient_data";
  const adherencePercent = adaptiveReview.adherence.mealCoverageRatio * 100;
  const generalStateMessage = getGeneralStateMessage({
    recommendation: review.recommendation,
    cautionMessage: review.cautionMessage,
  });
  const periodLabel = `Ultimi ${adaptiveReview.analysisWindowDays} giorni`;

  return (
    <AppPage className="pb-28 pt-5">
      <section className="space-y-4">
        <PageHeader
          eyebrow="Nutrizione"
          title="Revisione nutrizionale"
          description="Controlla andamento, aderenza e possibili aggiustamenti."
          action={
            <Link
              href="/nutrition"
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--app-border)] bg-white/[0.03] px-4 text-sm font-semibold text-[var(--app-text)]"
            >
              Nutrizione
            </Link>
          }
          meta={<AppBadge tone={getStatusTone(review.status)}>{review.status}</AppBadge>}
        />

        <AppCard className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(165deg,var(--app-surface-2)_0%,#101314_58%,#0f1213_100%)] px-[18px] py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[var(--app-muted-2)]">
                  Periodo
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[var(--app-text)]">
                  {periodLabel}
                </h2>
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  {formatItalianDate(review.week.start)} - {formatItalianDate(review.week.end)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-primary)]">
                  Costanza
                </p>
                <p className="mt-2 font-metrics text-[28px] font-semibold leading-none tracking-[-0.03em] text-[var(--app-text)]">
                  {formatPercent(adherencePercent)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Media calorie
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {formatNumber(review.metrics.averageCaloriesConsumed)} kcal
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Aderenza
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {adaptiveReview.adherence.trackedDays}/{adaptiveReview.analysisWindowDays} giorni
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--app-border)] bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Peso
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {getWeightSummary(review)}
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-primary)]">
                  Andamento
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {getBodyWeightTrendLabel(review.metrics.weightTrend)}
                </p>
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Stato generale
              </p>
              <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                {generalStateMessage}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                {review.recommendation}
              </p>
            </div>
            <AppBadge tone={getStatusTone(review.status)}>{review.status}</AppBadge>
          </div>

          {review.cautionMessage ? (
            <div className="mt-4 rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {review.cautionMessage}
            </div>
          ) : null}
        </AppCard>

        <AppCard className="p-4">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Target attuali
              </p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                I tuoi riferimenti di oggi
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Calorie
              </p>
              <p className="mt-2 font-metrics text-[24px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                {formatNumber(nutritionProfile.calorieTarget)}
              </p>
              <p className="text-sm text-[var(--app-muted)]">kcal</p>
            </div>

            <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Proteine
              </p>
              <p className="mt-2 font-metrics text-[24px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                {formatNumber(nutritionProfile.proteinTarget)}
              </p>
              <p className="text-sm text-[var(--app-muted)]">g</p>
            </div>

            <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Carboidrati
              </p>
              <p className="mt-2 font-metrics text-[24px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                {formatNumber(nutritionProfile.carbsTarget)}
              </p>
              <p className="text-sm text-[var(--app-muted)]">g</p>
            </div>

            <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Grassi
              </p>
              <p className="mt-2 font-metrics text-[24px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                {formatNumber(nutritionProfile.fatTarget)}
              </p>
              <p className="text-sm text-[var(--app-muted)]">g</p>
            </div>
          </div>
        </AppCard>

        {isInsufficientData ? (
          <AppCard className="p-4">
            <EmptyState
              title="Dati ancora insufficienti"
              description="Registra pasti e peso per qualche giorno in piu prima della prossima revisione."
              action={
                <div className="grid gap-3 sm:grid-cols-2">
                  <SecondaryButton href="/nutrition">Vai alla nutrizione</SecondaryButton>
                  <SecondaryButton href="/body-weight">Registra peso</SecondaryButton>
                </div>
              }
            />
          </AppCard>
        ) : (
          <AdaptiveReviewCard
            review={adaptiveReview}
            currentTargets={{
              calories: nutritionProfile.calorieTarget,
              protein: nutritionProfile.proteinTarget,
              carbs: nutritionProfile.carbsTarget,
              fat: nutritionProfile.fatTarget,
            }}
          />
        )}

        <AppCard className="p-4">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--app-text)]">
              <span>Dettagli revisione</span>
              <span className="text-[var(--app-primary)] group-open:hidden">Mostra</span>
              <span className="hidden text-[var(--app-primary)] group-open:inline">
                Mostra meno
              </span>
            </summary>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                    Giorni analizzati
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                    {review.metrics.daysAnalyzed}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                    Pasti registrati
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                    {review.metrics.totalMeals}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                    Ultimo peso
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                    {formatWeight(review.metrics.latestWeightKg)}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                    Variazione 7 giorni
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                    {formatCompactWeightDelta(review.metrics.weightChange7DaysKg)}
                  </p>
                </div>
              </div>

              {review.signals.length > 0 ? (
                <div className="space-y-2">
                  {review.signals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-sm text-[var(--app-text)]"
                    >
                      {signal}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        </AppCard>
      </section>

      <AppBottomNav />
    </AppPage>
  );
}
