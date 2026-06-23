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
  const PAGE_SIZE = 3;
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [entries, setEntries] = useState(initialEntries);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<number | null>(null);
  const [pageStart, setPageStart] = useState(0);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    const maxPageStart = Math.max(0, Math.floor((entries.length - 1) / PAGE_SIZE) * PAGE_SIZE);
    setPageStart((current) => Math.min(current, maxPageStart));
  }, [entries.length, PAGE_SIZE]);

  const visibleEntries = entries.slice(pageStart, pageStart + PAGE_SIZE);
  const hasOlderEntries = pageStart + PAGE_SIZE < entries.length;
  const hasNewerEntries = pageStart > 0;

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
        <div className="rounded-[18px] border border-[var(--app-primary-border)] bg-[var(--app-primary-soft)] px-4 py-3 text-sm text-[var(--app-primary)]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-white/10 bg-[var(--app-surface-soft)] px-5 py-6 text-sm text-[var(--app-muted)]">
          Nessuna pesata disponibile.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((entry) => {
            const globalIndex = entries.findIndex((candidate) => candidate.id === entry.id);
            const olderEntry = globalIndex >= 0 ? entries[globalIndex + 1] ?? null : null;
            const variation = olderEntry ? entry.weightKg - olderEntry.weightKg : null;
            const dateKey = entry.dateKey ?? getBodyWeightDateKey(entry.date);
            const isEditing = editingEntryId === entry.id;
            const isPending = pendingEntryId === entry.id || isRefreshing;

            return (
              <article
                key={entry.id}
                className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4"
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                        Modifica pesata
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-[var(--app-text)]">
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
                        <p className="text-sm text-[var(--app-muted)]">
                          {formatNutritionDateLabel(dateKey)}
                        </p>
                        <p className="mt-2 font-metrics text-[26px] font-semibold leading-none tracking-[-0.03em] text-[var(--app-text)]">
                          {formatWeight(entry.weightKg)} kg
                        </p>
                      </div>

                      <div className="rounded-[14px] border border-[var(--app-border)] bg-white/[0.03] px-3 py-2 text-right">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                          Variazione
                        </p>
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            variation === null || variation === 0
                              ? "text-[var(--app-text)]"
                              : "text-[var(--app-primary)]"
                          }`}
                        >
                          {formatBodyWeightDelta(variation)}
                        </p>
                      </div>
                    </div>

                    {entry.notes ? (
                      <p className="rounded-[16px] border border-[var(--app-border)] bg-white/[0.03] px-3 py-3 text-sm leading-6 text-[var(--app-muted)]">
                        {entry.notes}
                      </p>
                    ) : null}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntryId(entry.id);
                          setMessage(null);
                          setError(null);
                        }}
                        disabled={isPending}
                        className="app-secondary-button min-h-[52px] flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Modifica
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        disabled={isPending}
                        className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/14 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {entries.length > PAGE_SIZE ? (
            <div className="flex items-center justify-center gap-4 pt-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  if (hasOlderEntries) {
                    setPageStart((current) => current + PAGE_SIZE);
                  }
                }}
                disabled={!hasOlderEntries}
                aria-label="Mostra registrazioni precedenti"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                  hasOlderEntries
                    ? "text-[var(--app-primary)] hover:text-[var(--app-text)]"
                    : "cursor-default text-[var(--app-muted-2)]"
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  ←
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (hasNewerEntries) {
                    setPageStart(0);
                  }
                }}
                disabled={!hasNewerEntries}
                className={`min-w-[92px] text-center text-[12px] font-medium transition ${
                  hasNewerEntries
                    ? "text-[var(--app-primary)] hover:text-[var(--app-text)]"
                    : "cursor-default text-[var(--app-muted)]"
                }`}
              >
                {hasNewerEntries
                  ? "Recenti"
                  : `${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, entries.length)} di ${entries.length}`}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (hasNewerEntries) {
                    setPageStart((current) => Math.max(current - PAGE_SIZE, 0));
                  }
                }}
                disabled={!hasNewerEntries}
                aria-label="Torna alle registrazioni piu recenti"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                  hasNewerEntries
                    ? "text-[var(--app-primary)] hover:text-[var(--app-text)]"
                    : "cursor-default text-[var(--app-muted-2)]"
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  →
                </span>
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
