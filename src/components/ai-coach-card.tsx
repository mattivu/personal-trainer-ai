"use client";

import { useState } from "react";
import type { CoachMode, CoachResult } from "@/lib/ai/coach-prompts";

type AiCoachCardProps = {
  mode: CoachMode;
  workoutId?: number;
  workoutLogId?: number;
  buttonLabel?: string;
};

type CoachApiSuccess = {
  ok: true;
  mode: CoachMode;
  result: CoachResult;
};

type CoachApiError = {
  ok: false;
  message: string;
};

type CoachApiResponse = CoachApiSuccess | CoachApiError;

async function parseApiResponse(response: Response) {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return {
      ok: false,
      message: "Risposta vuota dal server.",
    } satisfies CoachApiError;
  }

  try {
    return JSON.parse(trimmedBody) as CoachApiResponse;
  } catch {
    return {
      ok: false,
      message: trimmedBody,
    } satisfies CoachApiError;
  }
}

function ResultList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-2 space-y-2 text-sm text-neutral-300">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiCoachCard({
  mode,
  workoutId,
  workoutLogId,
  buttonLabel = "Chiedi al coach AI",
}: AiCoachCardProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          workoutId,
          workoutLogId,
        }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok || !payload.ok) {
        setResult(null);
        setError(
          payload.ok ? "Errore durante l'analisi." : payload.message || "Errore durante l'analisi."
        );
        return;
      }

      setResult(payload.result);
    } catch {
      setResult(null);
      setError("Errore di rete durante l'analisi del Coach AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Coach AI
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            Analisi testuale basata sui dati esistenti di allenamento, nutrizione, peso e cardio. Nessuna modifica automatica.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
        >
          {loading ? "Analisi in corso..." : buttonLabel}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <h3 className="text-xl font-semibold text-white">{result.title}</h3>
            <p className="mt-3 text-sm text-neutral-300">{result.summary}</p>
          </div>

          <ResultList title="Punti chiave" items={result.keyPoints} />
          <ResultList title="Focus suggeriti" items={result.suggestedFocus} />
          <ResultList title="Cautele" items={result.cautions} />

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <h4 className="text-sm font-semibold text-white">Prossima azione</h4>
            <p className="mt-2 text-sm text-neutral-300">{result.nextAction}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
