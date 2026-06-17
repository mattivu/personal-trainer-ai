"use client";

import type { MealEntry } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  MEAL_TYPE_OPTIONS,
  getMealTypeLabel,
} from "@/lib/nutrition/meals";
import {
  MEAL_NOTES_MAX_LENGTH,
  validateMealInput,
} from "@/lib/nutrition/validation";

type MealEntryListProps = {
  meals: MealEntry[];
};

type FormState = {
  mealType: string;
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
};

type ApiErrorResponse = {
  ok: false;
  message?: string;
};

type PatchApiResponse =
  | {
      ok: true;
      meal: MealEntry;
    }
  | ApiErrorResponse;

type DeleteApiResponse =
  | {
      ok: true;
    }
  | ApiErrorResponse;

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function createFormState(meal: MealEntry): FormState {
  return {
    mealType: meal.mealType,
    name: meal.name,
    calories: String(meal.calories),
    protein: String(meal.protein),
    carbs: String(meal.carbs),
    fat: String(meal.fat),
    notes: meal.notes ?? "",
  };
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

export function MealEntryList({ meals: initialMeals }: MealEntryListProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [meals, setMeals] = useState(initialMeals);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingMealId, setPendingMealId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null);

  useEffect(() => {
    setMeals(initialMeals);
  }, [initialMeals]);

  function refreshPage() {
    startRefresh(() => {
      router.refresh();
    });
  }

  function startEditing(meal: MealEntry) {
    setEditingMealId(meal.id);
    setForm(createFormState(meal));
    setError(null);
    setMessage(null);
  }

  function cancelEditing() {
    setEditingMealId(null);
    setForm(null);
    setError(null);
  }

  async function handleSave(mealId: number) {
    if (!form) {
      return;
    }

    const mealInput = validateMealInput(form);

    if (!mealInput.ok) {
      setError(mealInput.message);
      return;
    }

    setPendingMealId(mealId);
    setPendingAction("save");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/nutrition/meals/${mealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mealInput.value),
      });
      const payload = await parseApiResponse<PatchApiResponse>(response);

      if (!response.ok || !payload.ok) {
        setError(
          !payload.ok
            ? payload.message ?? "Impossibile salvare le modifiche."
            : "Impossibile salvare le modifiche."
        );
        return;
      }

      setMeals((current) =>
        current.map((meal) => (meal.id === mealId ? payload.meal : meal))
      );
      setEditingMealId(null);
      setForm(null);
      setMessage("Pasto aggiornato.");
      refreshPage();
    } catch {
      setError("Errore di rete durante il salvataggio delle modifiche.");
    } finally {
      setPendingMealId(null);
      setPendingAction(null);
    }
  }

  async function handleDelete(mealId: number) {
    const confirmed = window.confirm("Vuoi eliminare questo pasto?");

    if (!confirmed) {
      return;
    }

    setPendingMealId(mealId);
    setPendingAction("delete");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/nutrition/meals/${mealId}`, {
        method: "DELETE",
      });
      const payload = await parseApiResponse<DeleteApiResponse>(response);

      if (!response.ok || !payload.ok) {
        setError(
          !payload.ok
            ? payload.message ?? "Impossibile eliminare il pasto."
            : "Impossibile eliminare il pasto."
        );
        return;
      }

      setMeals((current) => current.filter((meal) => meal.id !== mealId));

      if (editingMealId === mealId) {
        setEditingMealId(null);
        setForm(null);
      }

      setMessage("Pasto eliminato.");
      refreshPage();
    } catch {
      setError("Errore di rete durante l'eliminazione del pasto.");
    } finally {
      setPendingMealId(null);
      setPendingAction(null);
    }
  }

  const isMutating = pendingAction !== null;

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

      {meals.length > 0 ? (
        meals.map((meal) => {
          const isEditing = editingMealId === meal.id && form !== null;
          const isPendingMeal = pendingMealId === meal.id;

          return (
            <article
              key={meal.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">
                        Modifica pasto
                      </p>
                      <h3 className="mt-2 font-semibold text-white">{meal.name}</h3>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Tipo pasto</span>
                      <select
                        value={form.mealType}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  mealType: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
                      >
                        {MEAL_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Nome alimento/pasto</span>
                      <input
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  name: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Calorie</span>
                      <input
                        inputMode="numeric"
                        value={form.calories}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  calories: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
                      />
                    </label>

                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Proteine g</span>
                      <input
                        inputMode="numeric"
                        value={form.protein}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  protein: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
                      />
                    </label>

                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Carboidrati g</span>
                      <input
                        inputMode="numeric"
                        value={form.carbs}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  carbs: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
                      />
                    </label>

                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Grassi g</span>
                      <input
                        inputMode="numeric"
                        value={form.fat}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  fat: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
                      />
                    </label>
                  </div>

                  <label className="block space-y-2 text-sm text-neutral-200">
                    <span>Note opzionali</span>
                    <textarea
                      rows={3}
                      value={form.notes}
                      maxLength={MEAL_NOTES_MAX_LENGTH}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                notes: event.target.value,
                              }
                            : current
                        )
                      }
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
                    />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={isMutating || isRefreshing}
                      onClick={() => handleSave(meal.id)}
                      className="inline-flex justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                      {isPendingMeal && pendingAction === "save"
                        ? "Salvataggio..."
                        : "Salva modifiche"}
                    </button>

                    <button
                      type="button"
                      disabled={isMutating || isRefreshing}
                      onClick={cancelEditing}
                      className="inline-flex justify-center rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">
                        {getMealTypeLabel(meal.mealType)}
                      </p>
                      <h3 className="mt-2 font-semibold text-white">{meal.name}</h3>
                    </div>
                    <p className="text-sm font-semibold text-neutral-200">
                      {formatNumber(meal.calories)} kcal
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-neutral-400">
                    P {formatNumber(meal.protein)} g · C {formatNumber(meal.carbs)} g ·
                    F {formatNumber(meal.fat)} g
                  </p>

                  {meal.notes ? (
                    <p className="mt-3 text-sm text-neutral-500">{meal.notes}</p>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={isMutating || isRefreshing}
                      onClick={() => startEditing(meal)}
                      className="inline-flex justify-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"
                    >
                      Modifica
                    </button>

                    <button
                      type="button"
                      disabled={isMutating || isRefreshing}
                      onClick={() => handleDelete(meal.id)}
                      className="inline-flex justify-center rounded-xl border border-rose-700 px-4 py-2 text-sm font-semibold text-rose-200 disabled:cursor-not-allowed disabled:text-rose-500"
                    >
                      {isPendingMeal && pendingAction === "delete"
                        ? "Eliminazione..."
                        : "Elimina"}
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950 p-5 text-sm text-neutral-400">
          Nessun pasto registrato oggi. Inserisci il primo per vedere il
          riepilogo della giornata.
        </div>
      )}
    </div>
  );
}
