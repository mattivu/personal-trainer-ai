"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SkipWorkoutButtonProps = {
  workoutId: number;
};

export function SkipWorkoutButton({ workoutId }: SkipWorkoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function skipWorkout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workout-logs/skip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workoutId,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message ?? "Errore durante l'aggiornamento della seduta.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore durante l'aggiornamento della seduta."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={skipWorkout}
        disabled={loading}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-100 disabled:opacity-50"
      >
        {loading ? "Aggiornamento..." : "Segna come saltata"}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
