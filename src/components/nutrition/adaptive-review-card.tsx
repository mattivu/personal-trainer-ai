"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdaptiveNutritionReview } from "@/lib/nutrition/adaptive-engine";
import { AppBadge } from "@/components/ui/app-badge";
import { AppCard } from "@/components/ui/app-card";

type AdaptiveReviewCardProps = {
  review: AdaptiveNutritionReview;
  currentTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

type ApplyAdjustmentResponse =
  | {
      ok: true;
      message: string;
      target: {
        calorieTarget: number;
        proteinTarget: number;
        carbsTarget: number;
        fatTarget: number;
        updatedAt: string;
      };
    }
  | {
      ok: false;
      message?: string;
    };

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${formatNumber(value, 0)}%`;
}

function formatMetric(value: number | null, unit: string, digits = 0) {
  if (value === null) {
    return "—";
  }

  return `${formatNumber(value, digits)} ${unit}`;
}

function formatDelta(value: number) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function getStatusLabel(status: AdaptiveNutritionReview["status"]) {
  switch (status) {
    case "adjustment_recommended":
      return "Modifica consigliata";
    case "caution":
      return "Da osservare";
    case "insufficient_data":
      return "Pochi dati";
    case "on_track":
    default:
      return "In linea";
  }
}

function getStatusTone(status: AdaptiveNutritionReview["status"]) {
  switch (status) {
    case "adjustment_recommended":
      return "accent" as const;
    case "caution":
      return "warning" as const;
    case "insufficient_data":
      return "neutral" as const;
    case "on_track":
    default:
      return "success" as const;
  }
}

function getRecommendationLabel(type: AdaptiveNutritionReview["recommendation"]["type"]) {
  switch (type) {
    case "increase_calories":
      return "Aumenta leggermente le calorie";
    case "decrease_calories":
      return "Riduci leggermente le calorie";
    case "increase_protein":
      return "Alza un po' le proteine";
    case "reduce_rate":
      return "Rallenta il ritmo";
    case "increase_activity":
      return "Aumenta leggermente il movimento";
    case "hold":
      return "Mantieni i target";
    case "none":
    default:
      return "Nessuna modifica necessaria";
  }
}

function getComparisonLabel(status: AdaptiveNutritionReview["status"]) {
  switch (status) {
    case "adjustment_recommended":
      return "Modifica consigliata";
    case "caution":
      return "Da osservare";
    case "insufficient_data":
      return "Servono più dati";
    case "on_track":
    default:
      return "Target stabile";
  }
}

async function parseApiResponse<T>(response: Response) {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return {
      ok: false,
      message: "Risposta non disponibile.",
    } as T;
  }

  try {
    return JSON.parse(trimmedBody) as T;
  } catch {
    return {
      ok: false,
      message: trimmedBody,
    } as T;
  }
}

export function AdaptiveReviewCard({
  review,
  currentTargets,
}: AdaptiveReviewCardProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canApply =
    review.status === "adjustment_recommended" && review.proposedTargets !== null;

  async function handleApply() {
    if (!canApply || pending) {
      return;
    }

    const confirmed = window.confirm(
      "Vuoi applicare questo aggiustamento ai target nutrizionali?"
    );

    if (!confirmed) {
      return;
    }

    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/nutrition/apply-adjustment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirm: true,
        }),
      });
      const payload = await parseApiResponse<ApplyAdjustmentResponse>(response);

      if (!response.ok || !payload.ok) {
        setError(
          !payload.ok
            ? payload.message ?? "Impossibile applicare la modifica."
            : "Impossibile applicare la modifica."
        );
        return;
      }

      setMessage(payload.message);
      startRefresh(() => {
        router.refresh();
      });
    } catch {
      setError("Errore di rete durante l'applicazione della modifica.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <AppCard className="rounded-[22px] border-[var(--app-primary-border)] bg-[linear-gradient(135deg,rgba(15,16,18,0.96),rgba(208,216,43,0.08))] p-4 shadow-none">
          <p className="text-sm text-[var(--app-text)]">{message}</p>
        </AppCard>
      ) : null}

      {error ? (
        <AppCard className="border-rose-500/30 bg-[linear-gradient(165deg,rgba(52,18,18,0.92),rgba(24,12,12,0.98))] p-4 shadow-none">
          <p className="text-sm text-rose-100">{error}</p>
        </AppCard>
      ) : null}

      {canApply && review.proposedTargets ? (
        <AppCard className="rounded-[24px] border-[var(--app-primary-border)] bg-[linear-gradient(145deg,rgba(18,21,22,0.98),rgba(208,216,43,0.08))] p-4 shadow-none">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-primary)]">
                Revisione
              </p>
              <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                Aggiustamento consigliato
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                {review.recommendation.reason}
              </p>
            </div>
            <AppBadge tone={getStatusTone(review.status)}>
              {getStatusLabel(review.status)}
            </AppBadge>
          </div>

          <div className="mt-4 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,17,18,0.98),rgba(18,21,22,0.98))] px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Target attuale
                </p>
                <p className="mt-2 font-metrics text-[30px] font-semibold leading-none tracking-[-0.04em] text-white">
                  {formatNumber(currentTargets.calories)}
                </p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">kcal</p>
              </div>

              <div className="shrink-0 text-[24px] font-semibold text-[var(--app-primary)]">→</div>

              <div className="min-w-0 text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Proposto
                </p>
                <p className="mt-2 font-metrics text-[30px] font-semibold leading-none tracking-[-0.04em] text-[var(--app-primary)]">
                  {formatNumber(review.proposedTargets.calories)}
                </p>
                <p className="mt-1 text-sm text-[var(--app-primary)]">kcal</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[var(--app-text)]">
                Proteine {formatNumber(currentTargets.protein)} →{" "}
                <span className="text-[var(--app-primary)]">
                  {formatNumber(review.proposedTargets.protein)} g
                </span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[var(--app-text)]">
                Carboidrati {formatNumber(currentTargets.carbs)} →{" "}
                <span className="text-[var(--app-primary)]">
                  {formatNumber(review.proposedTargets.carbs)} g
                </span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[var(--app-text)]">
                Grassi {formatNumber(currentTargets.fat)} →{" "}
                <span className="text-[var(--app-primary)]">
                  {formatNumber(review.proposedTargets.fat)} g
                </span>
              </span>
            </div>
          </div>

          {review.recommendation.caution ? (
            <div className="mt-4 rounded-[18px] border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3 text-sm leading-6 text-amber-50">
              {review.recommendation.caution}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply || pending || isRefreshing}
            className="app-primary-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending || isRefreshing ? "Applicazione..." : "Applica modifica"}
          </button>
        </AppCard>
      ) : (
        <AppCard className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Revisione
              </p>
              <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                {getComparisonLabel(review.status)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                {review.recommendation.reason}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                Continua a registrare pasti e peso per mantenere una revisione affidabile.
              </p>
            </div>
            <AppBadge tone={getStatusTone(review.status)}>
              {getStatusLabel(review.status)}
            </AppBadge>
          </div>
        </AppCard>
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
                  Periodo
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  Ultimi {review.analysisWindowDays} giorni
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Costanza
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {formatPercent(review.adherence.mealCoverageRatio * 100)}
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Media calorie
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {formatMetric(review.adherence.averageCalories, "kcal")}
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Movimento
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {formatMetric(review.adherence.averageActivityCalories, "kcal")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Proteine
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {formatMetric(review.adherence.averageProtein, "g")}
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Carboidrati
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {formatMetric(review.adherence.averageCarbs, "g")}
                </p>
              </div>

              <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                  Grassi
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {formatMetric(review.adherence.averageFat, "g")}
                </p>
              </div>
            </div>

            <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Andamento peso
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                {formatMetric(review.weightTrend.latestWeightKg, "kg", 1)}
              </p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                7 giorni {formatMetric(review.weightTrend.change7dKg, "kg", 1)} · 14 giorni{" "}
                {formatMetric(review.weightTrend.change14dKg, "kg", 1)}
              </p>
              {review.weightTrend.weeklyRatePercent !== null ? (
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  Ritmo settimanale: {formatPercent(review.weightTrend.weeklyRatePercent)}
                </p>
              ) : null}
            </div>

            <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Sintesi
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                {getRecommendationLabel(review.recommendation.type)}
              </p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                Calorie {formatDelta(review.recommendation.calorieDelta)} · Proteine{" "}
                {formatDelta(review.recommendation.proteinDelta)} · Carboidrati{" "}
                {formatDelta(review.recommendation.carbsDelta)} · Grassi{" "}
                {formatDelta(review.recommendation.fatDelta)}
              </p>
            </div>

            {review.warnings.length > 0 ? (
              <div className="space-y-2">
                {review.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-sm text-[var(--app-text)]"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </details>
      </AppCard>
    </div>
  );
}
