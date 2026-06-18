"use client";

import type { BodyWeightEntry } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  formatBodyWeightDelta,
  getBodyWeightDateKey,
} from "@/lib/body-weight-shared";
import { formatNutritionDateLabel } from "@/lib/nutrition/date";
import { BodyWeightForm } from "./body-weight-form";

type BodyWeightEntryWithDate = BodyWeightEntry & {
  dateKey?: string;
};

type BodyWeightListProps = {
  entries: BodyWeightEntryWithDate[];
};

type DeleteResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      message?: string;
    };

function formatWeight(value: number) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
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

export function BodyWeightList({ entries: initialEntries }: BodyWeightListProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [entries, setEntries] = useState(initialEntries);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<number | null>(null);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  function refreshPage() {
    startRefresh(() => {
      router.refresh();
    });
  }

  async function handleDelete(entryId: number) {
    const confirmed = window.confirm("Vuoi eliminare questa pesata?");

    if (!confirmed) {
      return;
    }

    setPendingEntryId(entryId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/body-weight/${entryId}`, {
        method: "DELETE",
      });
      const payload = await parseApiResponse<DeleteResponse>(response);

      if (!response.ok || !payload.ok) {
        setError(
          !payload.ok
            ? payload.message ?? "Impossibile eliminare la pesata."
            : "Impossibile eliminare la pesata."
        );
        return;
      }

      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      setEditingEntryId((current) => (current === entryId ? null : current));
      setMessage("Pesata eliminata.");
      refreshPage();
    } catch {
      setError("Errore di rete durante l'eliminazione della pesata.");
    } finally {
      setPendingEntryId(null);
    }
  }

  return (
    <div className="space-y-3">
      {message ? (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 px-5 py-6 text-sm text-neutral-400">
          Nessuna pesata disponibile negli ultimi 90 giorni.
        </div>
      ) : (
        entries.map((entry, index) => {
          const olderEntry = entries[index + 1] ?? null;
          const variation = olderEntry ? entry.weightKg - olderEntry.weightKg : null;
          const dateKey = entry.dateKey ?? getBodyWeightDateKey(entry.date);
          const isEditing = editingEntryId === entry.id;
          const isPending = pendingEntryId === entry.id || isRefreshing;

          return (
            <article
              key={entry.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">
                      Modifica pesata
                    </p>
                    <h3 className="mt-2 font-semibold text-white">
                      {formatNutritionDateLabel(dateKey)}
                    </h3>
                  </div>

                  <BodyWeightForm
                    initialValues={{
                      date: dateKey,
                      weightKg: String(entry.weightKg),
                      notes: entry.notes ?? "",
                    }}
                    submitLabel="Salva modifiche"
                    pendingLabel="Salvataggio..."
                    endpoint={`/api/body-weight/${entry.id}`}
                    method="PATCH"
                    onSaved={() => {
                      setEditingEntryId(null);
                      setMessage("Pesata aggiornata.");
                      setError(null);
                      refreshPage();
                    }}
                    onCancel={() => {
                      setEditingEntryId(null);
                      setError(null);
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">
                        {formatNutritionDateLabel(dateKey)}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {formatWeight(entry.weightKg)} kg
                      </p>
                    </div>

                    <div className="text-right text-sm text-neutral-400">
                      <p>Variazione</p>
                      <p className="mt-2 font-semibold text-neutral-100">
                        {formatBodyWeightDelta(variation)}
                      </p>
                    </div>
                  </div>

                  {entry.notes ? (
                    <p className="text-sm text-neutral-400">{entry.notes}</p>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEntryId(entry.id);
                        setMessage(null);
                        setError(null);
                      }}
                      disabled={isPending}
                      className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Modifica
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      disabled={isPending}
                      className="inline-flex justify-center rounded-xl border border-rose-800 px-4 py-3 text-sm font-semibold text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
