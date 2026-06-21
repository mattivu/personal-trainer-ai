"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdaptiveNutritionReview } from "@/lib/nutrition/adaptive-engine";

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
    return "Dati insufficienti";
  }

  return `${formatNumber(value, 2)}%`;
}

function formatMetric(value: number | null, unit: string, digits = 0) {
  if (value === null) {
    return "Dati insufficienti";
  }

  return `${formatNumber(value, digits)} ${unit}`;
}

function getStatusLabel(status: AdaptiveNutritionReview["status"]) {
  switch (status) {
    case "adjustment_recommended":
      return "Aggiustamento consigliato";
    case "caution":
      return "Attenzione";
    case "insufficient_data":
      return "Servono piu dati";
    case "on_track":
    default:
      return "In linea";
  }
}

function getStatusClasses(status: AdaptiveNutritionReview["status"]) {
  switch (status) {
    case "adjustment_recommended":
      return "border-sky-700 bg-sky-950/40 text-sky-200";
    case "caution":
      return "border-amber-700 bg-amber-950/40 text-amber-100";
    case "insufficient_data":
      return "border-neutral-700 bg-neutral-900 text-neutral-200";
    case "on_track":
    default:
      return "border-emerald-700 bg-emerald-950/40 text-emerald-200";
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
      return "Riduci il ritmo del cambiamento";
    case "increase_activity":
      return "Aumenta leggermente l'attivita";
    case "hold":
      return "Mantieni il target";
    case "none":
    default:
      return "Nessun aggiustamento";
  }
}

async function parseApiResponse<T>(response: Response) {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return {
      ok: false,
      message: "Risposta vuota dal server.",
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
            ? payload.message ?? "Impossibile applicare l'aggiustamento."
            : "Impossibile applicare l'aggiustamento."
        );
        return;
      }

      setMessage(payload.message);
      startRefresh(() => {
        router.refresh();
      });
    } catch {
      setError("Errore di rete durante l'applicazione dell'aggiustamento.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Revisione nutrizionale
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Aggiustamento proposto</h2>
          <p className="mt-3 max-w-2xl text-sm text-neutral-400">
            L'aggiustamento e orientativo e non sostituisce un professionista.
          </p>
        </div>

        <div
          className={`inline-flex rounded-xl border px-4 py-2 text-sm font-semibold ${getStatusClasses(review.status)}`}
        >
          {getStatusLabel(review.status)}
        </div>
      </div>

      {message ? (
        <div className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-sm text-neutral-500">Giorni registrati</p>
          <p className="mt-2 text-2xl font-semibold">
            {review.adherence.trackedDays}/{review.analysisWindowDays}
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            copertura {formatPercent(review.adherence.mealCoverageRatio * 100)}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-sm text-neutral-500">Calorie medie</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMetric(review.adherence.averageCalories, "kcal")}
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            attivita media {formatMetric(review.adherence.averageActivityCalories, "kcal")}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-sm text-neutral-500">Proteine medie</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMetric(review.adherence.averageProtein, "g")}
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            carboidrati {formatMetric(review.adherence.averageCarbs, "g")} · grassi{" "}
            {formatMetric(review.adherence.averageFat, "g")}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-sm text-neutral-500">Trend peso</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMetric(review.weightTrend.latestWeightKg, "kg", 1)}
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            7 giorni {formatMetric(review.weightTrend.change7dKg, "kg", 1)} · 14 giorni{" "}
            {formatMetric(review.weightTrend.change14dKg, "kg", 1)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-sm text-neutral-500">Raccomandazione</p>
          <p className="mt-2 text-xl font-semibold">
            {getRecommendationLabel(review.recommendation.type)}
          </p>
          <p className="mt-3 text-sm text-neutral-300">{review.recommendation.reason}</p>
          {review.recommendation.caution ? (
            <p className="mt-4 rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
              {review.recommendation.caution}
            </p>
          ) : null}
          {review.weightTrend.weeklyRatePercent !== null ? (
            <p className="mt-4 text-sm text-neutral-400">
              Variazione settimanale stimata: {formatPercent(review.weightTrend.weeklyRatePercent)}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <p className="text-sm text-neutral-500">Target attuale</p>
          <p className="mt-2 text-sm text-neutral-300">
            {formatNumber(currentTargets.calories)} kcal · {formatNumber(currentTargets.protein)} g
            proteine · {formatNumber(currentTargets.carbs)} g carboidrati ·{" "}
            {formatNumber(currentTargets.fat)} g grassi
          </p>

          <p className="mt-5 text-sm text-neutral-500">Target proposto</p>
          <p className="mt-2 text-sm text-neutral-300">
            {review.proposedTargets
              ? `${formatNumber(review.proposedTargets.calories)} kcal · ${formatNumber(review.proposedTargets.protein)} g proteine · ${formatNumber(review.proposedTargets.carbs)} g carboidrati · ${formatNumber(review.proposedTargets.fat)} g grassi`
              : "Nessun nuovo target da applicare ora."}
          </p>

          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply || pending || isRefreshing}
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
          >
            {pending || isRefreshing ? "Applicazione..." : "Applica aggiustamento"}
          </button>
        </div>
      </div>

      {review.warnings.length > 0 ? (
        <div className="mt-6 space-y-3">
          {review.warnings.map((warning) => (
            <p
              key={warning}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300"
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
