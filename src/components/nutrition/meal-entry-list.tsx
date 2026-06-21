"use client";

import type { MealEntry } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  formatNutritionNumber,
  getMealTypeLabel,
  getQuantityLabel,
  MEAL_TYPE_OPTIONS,
  QUANTITY_UNIT_OPTIONS,
} from "@/lib/nutrition/meals";
import {
  MEAL_BRAND_MAX_LENGTH,
  MEAL_NOTES_MAX_LENGTH,
  validateMealInput,
} from "@/lib/nutrition/validation";

type MealEntryListProps = {
  meals: MealEntry[];
};

type FormState = {
  mealType: string;
  name: string;
  quantityValue: string;
  quantityUnit: string;
  brand: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
  nutritionSource: "manual" | "ai_estimate" | "";
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

function createFormState(meal: MealEntry): FormState {
  return {
    mealType: meal.mealType,
    name: meal.name,
    quantityValue:
      typeof meal.quantityValue === "number" ? String(meal.quantityValue) : "",
    quantityUnit: meal.quantityUnit ?? "",
    brand: meal.brand ?? "",
    calories: String(meal.calories),
    protein: String(meal.protein),
    carbs: String(meal.carbs),
    fat: String(meal.fat),
    notes: meal.notes ?? "",
    nutritionSource:
      meal.nutritionSource === "manual" || meal.nutritionSource === "ai_estimate"
        ? meal.nutritionSource
        : "",
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
  const [showNutritionFields, setShowNutritionFields] = useState(false);

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
    setShowNutritionFields(false);
    setError(null);
    setMessage(null);
  }

  function cancelEditing() {
    setEditingMealId(null);
    setForm(null);
    setShowNutritionFields(false);
    setError(null);
  }

  async function handleSave(mealId: number) {
    if (!form) {
      return;
    }

    const mealInput = validateMealInput(form);

    if (!mealInput.ok) {
      setError(mealInput.message);
      setShowNutritionFields(true);
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
        body: JSON.stringify({
          ...mealInput.value,
          nutritionSource: mealInput.value.nutritionSource ?? "manual",
        }),
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
      setShowNutritionFields(false);
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
        setShowNutritionFields(false);
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
          const quantityLabel = getQuantityLabel(meal.quantityValue, meal.quantityUnit);

          return (
            <article
              key={meal.id}
              className="rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4"
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
                        className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
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
                        className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Quantità</span>
                      <input
                        inputMode="decimal"
                        value={form.quantityValue}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  quantityValue: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                      />
                    </label>

                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Unità</span>
                      <select
                        value={form.quantityUnit}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  quantityUnit: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                      >
                        <option value="">Seleziona</option>
                        {QUANTITY_UNIT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-neutral-200">
                      <span>Marca</span>
                      <input
                        value={form.brand}
                        maxLength={MEAL_BRAND_MAX_LENGTH}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  brand: event.target.value,
                                }
                              : current
                          )
                        }
                        className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                      />
                    </label>

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
                        className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                      />
                    </label>
                  </div>

                  <div className="rounded-[22px] border border-[var(--app-border)] bg-[rgba(15,18,19,0.84)]">
                    <button
                      type="button"
                      onClick={() => setShowNutritionFields((current) => !current)}
                      className="flex w-full items-center justify-between px-4 py-4 text-left"
                    >
                      <div>
                        <p className="font-semibold text-[var(--app-text)]">
                          Valori nutrizionali
                        </p>
                        <p className="mt-1 text-sm text-[var(--app-muted)]">
                          Controlla e correggi i valori prima di salvare.
                        </p>
                      </div>
                      <span className="text-sm text-[var(--app-muted)]">
                        {showNutritionFields ? "Chiudi" : "Apri"}
                      </span>
                    </button>

                    {showNutritionFields ? (
                      <div className="grid grid-cols-2 gap-4 border-t border-[var(--app-border)] px-4 py-4 sm:grid-cols-4">
                        <label className="space-y-2 text-sm text-[var(--app-text)]">
                          <span className="font-medium text-[var(--app-muted)]">Calorie</span>
                          <input
                            inputMode="decimal"
                            value={form.calories}
                            onChange={(event) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      calories: event.target.value,
                                      nutritionSource: "manual",
                                    }
                                  : current
                              )
                            }
                            className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                          />
                        </label>

                        <label className="space-y-2 text-sm text-[var(--app-text)]">
                          <span className="font-medium text-[var(--app-muted)]">Proteine</span>
                          <input
                            inputMode="decimal"
                            value={form.protein}
                            onChange={(event) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      protein: event.target.value,
                                      nutritionSource: "manual",
                                    }
                                  : current
                              )
                            }
                            className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                          />
                        </label>

                        <label className="space-y-2 text-sm text-[var(--app-text)]">
                          <span className="font-medium text-[var(--app-muted)]">
                            Carboidrati
                          </span>
                          <input
                            inputMode="decimal"
                            value={form.carbs}
                            onChange={(event) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      carbs: event.target.value,
                                      nutritionSource: "manual",
                                    }
                                  : current
                              )
                            }
                            className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                          />
                        </label>

                        <label className="space-y-2 text-sm text-[var(--app-text)]">
                          <span className="font-medium text-[var(--app-muted)]">Grassi</span>
                          <input
                            inputMode="decimal"
                            value={form.fat}
                            onChange={(event) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      fat: event.target.value,
                                      nutritionSource: "manual",
                                    }
                                  : current
                              )
                            }
                            className="w-full rounded-2xl border border-[var(--app-border)] bg-[rgba(10,13,13,0.65)] px-4 py-3 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={isMutating || isRefreshing}
                      onClick={() => handleSave(meal.id)}
                      className="inline-flex min-h-[48px] justify-center rounded-2xl bg-[var(--app-primary)] px-5 py-3 font-semibold text-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPendingMeal && pendingAction === "save"
                        ? "Salvataggio..."
                        : "Salva modifiche"}
                    </button>

                    <button
                      type="button"
                      disabled={isMutating || isRefreshing}
                      onClick={cancelEditing}
                      className="inline-flex min-h-[48px] justify-center rounded-2xl border border-[var(--app-border)] px-5 py-3 font-semibold text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
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
                    <p className="font-metrics text-sm font-semibold text-[var(--app-text)]">
                      {formatNutritionNumber(meal.calories)} kcal
                    </p>
                  </div>

                  {quantityLabel ? (
                    <p className="mt-3 text-sm text-neutral-400">Quantità: {quantityLabel}</p>
                  ) : null}

                  <p className="mt-3 text-sm text-neutral-400">
                    P {formatNutritionNumber(meal.protein)} g · C{" "}
                    {formatNutritionNumber(meal.carbs)} g · F{" "}
                    {formatNutritionNumber(meal.fat)} g
                  </p>

                  {meal.brand ? (
                    <p className="mt-3 text-sm text-neutral-400">Marca: {meal.brand}</p>
                  ) : null}

                  {meal.notes ? (
                    <p className="mt-3 text-sm text-neutral-500">{meal.notes}</p>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={isMutating || isRefreshing}
                      onClick={() => startEditing(meal)}
                      className="inline-flex min-h-[42px] justify-center rounded-2xl border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="rounded-[22px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface-soft)] p-5 text-sm text-[var(--app-muted)]">
          Nessun pasto registrato per questo giorno.
        </div>
      )}
    </div>
  );
}
