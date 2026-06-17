"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MEAL_TYPE_OPTIONS } from "@/lib/nutrition/meals";
import {
  MEAL_NOTES_MAX_LENGTH,
  validateMealInput,
} from "@/lib/nutrition/validation";

type MealEntryFormProps = {
  date: string;
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

type FoodEstimate = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionDescription: string;
  confidence: "low" | "medium" | "high";
  assumptions: string[];
};

type SaveApiResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      message?: string;
    };

type EstimateApiResponse =
  | {
      ok: true;
      estimate: FoodEstimate;
    }
  | {
      ok: false;
      message?: string;
    };

const INITIAL_STATE: FormState = {
  mealType: "breakfast",
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  notes: "",
};

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

function getConfidenceLabel(confidence: FoodEstimate["confidence"]) {
  switch (confidence) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
    default:
      return "Bassa";
  }
}

function buildEstimateNotes(estimate: FoodEstimate) {
  const parts = [estimate.portionDescription.trim(), ...estimate.assumptions]
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return parts.join("\n");
}

export function MealEntryForm({ date }: MealEntryFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<FoodEstimate | null>(null);

  async function handleEstimate() {
    const normalizedDescription = description.replace(/\s+/g, " ").trim();

    if (!normalizedDescription) {
      setEstimateError("Descrivi il pasto prima di richiedere la stima.");
      return;
    }

    setEstimateError(null);
    setSaveError(null);
    setEstimating(true);

    try {
      const response = await fetch("/api/nutrition/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: normalizedDescription,
          mealType: form.mealType,
        }),
      });
      const payload = await parseApiResponse<EstimateApiResponse>(response);

      if (!response.ok || !payload.ok) {
        setEstimateError(
          !payload.ok
            ? payload.message ?? "Impossibile stimare il pasto."
            : "Impossibile stimare il pasto."
        );
        return;
      }

      const estimatedNotes = buildEstimateNotes(payload.estimate);

      setEstimate(payload.estimate);
      setForm((current) => ({
        ...current,
        name: payload.estimate.name,
        calories: String(payload.estimate.calories),
        protein: String(payload.estimate.protein),
        carbs: String(payload.estimate.carbs),
        fat: String(payload.estimate.fat),
        notes: estimatedNotes.slice(0, MEAL_NOTES_MAX_LENGTH),
      }));
    } catch {
      setEstimateError("Errore di rete durante la stima del pasto.");
    } finally {
      setEstimating(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const mealInput = validateMealInput(form);

    if (!mealInput.ok) {
      setSaveError(mealInput.message);
      return;
    }

    setSaveError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/nutrition/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          mealType: mealInput.value.mealType,
          name: mealInput.value.name,
          calories: mealInput.value.calories,
          protein: mealInput.value.protein,
          carbs: mealInput.value.carbs,
          fat: mealInput.value.fat,
          notes: mealInput.value.notes,
        }),
      });
      const payload = await parseApiResponse<SaveApiResponse>(response);

      if (!response.ok || !payload.ok) {
        setSaveError(
          !payload.ok
            ? payload.message ?? "Impossibile aggiungere il pasto."
            : "Impossibile aggiungere il pasto."
        );
        return;
      }

      setForm(INITIAL_STATE);
      setDescription("");
      setEstimate(null);
      router.refresh();
    } catch {
      setSaveError("Errore di rete durante il salvataggio del pasto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-sky-800/60 bg-sky-950/20 p-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-100">Stima AI del pasto</p>
            <p className="mt-1 text-sm text-sky-50/80">
              La stima è indicativa. Controlla e correggi i valori prima di salvare.
            </p>
          </div>

          <label className="space-y-2 text-sm text-neutral-200">
            <span>Descrivi il pasto</span>
            <textarea
              rows={3}
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-sky-900/60 bg-neutral-950 px-4 py-3 text-white outline-none"
              placeholder="Es. pasta al pomodoro 120g, pollo con riso e verdure…"
            />
          </label>

          {estimateError ? (
            <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {estimateError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={estimating || saving}
              onClick={handleEstimate}
              className="inline-flex justify-center rounded-xl bg-sky-300 px-5 py-3 font-semibold text-sky-950 disabled:cursor-not-allowed disabled:bg-sky-100 sm:w-auto"
            >
              {estimating ? "Stima in corso..." : "Stima con AI"}
            </button>

            {estimate ? (
              <p className="text-sm text-sky-100">
                Affidabilità stima: {getConfidenceLabel(estimate.confidence)}
              </p>
            ) : null}
          </div>

          {estimate ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 text-sm text-neutral-200">
              <p className="font-semibold text-white">{estimate.name}</p>
              <p className="mt-2 text-neutral-400">
                Porzione stimata: {estimate.portionDescription}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-neutral-500">Calorie</p>
                  <p className="mt-1 font-semibold text-white">{estimate.calories}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Proteine</p>
                  <p className="mt-1 font-semibold text-white">{estimate.protein} g</p>
                </div>
                <div>
                  <p className="text-neutral-500">Carboidrati</p>
                  <p className="mt-1 font-semibold text-white">{estimate.carbs} g</p>
                </div>
                <div>
                  <p className="text-neutral-500">Grassi</p>
                  <p className="mt-1 font-semibold text-white">{estimate.fat} g</p>
                </div>
              </div>

              {estimate.confidence === "low" ? (
                <div className="mt-3 rounded-xl border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-amber-100">
                  Quantità poco precisa: controlla i valori.
                </div>
              ) : null}

              {estimate.assumptions.length > 0 ? (
                <div className="mt-3">
                  <p className="font-medium text-white">Assunzioni usate</p>
                  <ul className="mt-2 space-y-1 text-neutral-400">
                    {estimate.assumptions.map((assumption) => (
                      <li key={assumption}>• {assumption}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {saveError ? (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {saveError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-neutral-200">
          <span>Tipo pasto</span>
          <select
            value={form.mealType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                mealType: event.target.value,
              }))
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
              setForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
            placeholder="Esempio: Yogurt e frutta"
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
              setForm((current) => ({
                ...current,
                calories: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
            placeholder="420"
          />
        </label>

        <label className="space-y-2 text-sm text-neutral-200">
          <span>Proteine g</span>
          <input
            inputMode="numeric"
            value={form.protein}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                protein: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
            placeholder="25"
          />
        </label>

        <label className="space-y-2 text-sm text-neutral-200">
          <span>Carboidrati g</span>
          <input
            inputMode="numeric"
            value={form.carbs}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                carbs: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
            placeholder="48"
          />
        </label>

        <label className="space-y-2 text-sm text-neutral-200">
          <span>Grassi g</span>
          <input
            inputMode="numeric"
            value={form.fat}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fat: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
            placeholder="14"
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
            setForm((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none"
          placeholder="Porzione, marca o dettagli utili."
        />
      </label>

      <button
        type="submit"
        disabled={saving || estimating}
        className="inline-flex w-full justify-center rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:w-auto"
      >
        {saving ? "Salvataggio..." : "Aggiungi pasto"}
      </button>
    </form>
  );
}
