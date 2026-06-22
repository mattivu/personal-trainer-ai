"use client";

import type { MealType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarcodeScanner } from "@/components/nutrition/barcode-scanner";
import {
  formatNutritionNumber,
  getMealTypeLabel,
  getQuantityLabel,
  QUANTITY_UNIT_OPTIONS,
} from "@/lib/nutrition/meals";
import {
  MEAL_BRAND_MAX_LENGTH,
  MEAL_NOTES_MAX_LENGTH,
  validateMealInput,
} from "@/lib/nutrition/validation";

export type MealEntryTab = "estimate" | "manual" | "barcode";

type MealEntryFormProps = {
  date: string;
  mealType: MealType;
  activeTab: MealEntryTab;
  onTabChange: (tab: MealEntryTab) => void;
  onSaved?: () => void;
};

type FormState = {
  mealType: MealType;
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

type FoodEstimate = {
  name: string;
  quantityValue: number | null;
  quantityUnit: string | null;
  brand: string | null;
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

const NUTRITION_GRID_CLASS = "grid grid-cols-2 gap-3";
const NUTRITION_LABEL_CLASS =
  "block break-words text-[10px] font-medium uppercase leading-tight tracking-[0.14em] text-[var(--app-muted)]";
const NUTRITION_PREVIEW_LABEL_CLASS =
  "block break-words text-[10px] uppercase leading-tight tracking-[0.14em] text-[var(--app-muted-2)]";

const INITIAL_STATE: FormState = {
  mealType: "breakfast",
  name: "",
  quantityValue: "",
  quantityUnit: "",
  brand: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  notes: "",
  nutritionSource: "",
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

function hasNutritionValues(form: FormState) {
  return [form.calories, form.protein, form.carbs, form.fat].every((value) =>
    value.trim()
  );
}

function getResetState(mealType: MealType): FormState {
  return {
    ...INITIAL_STATE,
    mealType,
  };
}

function NutritionFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (field: "calories" | "protein" | "carbs" | "fat", value: string) => void;
}) {
  return (
    <div className={`${NUTRITION_GRID_CLASS} border-t border-white/8 px-4 py-4`}>
      <label className="min-w-0 space-y-2 text-sm text-[var(--app-text)]">
        <span className={NUTRITION_LABEL_CLASS}>Calorie</span>
        <input
          inputMode="decimal"
          value={form.calories}
          onChange={(event) => onChange("calories", event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
          placeholder="420"
        />
      </label>

      <label className="min-w-0 space-y-2 text-sm text-[var(--app-text)]">
        <span className={NUTRITION_LABEL_CLASS}>Proteine</span>
        <input
          inputMode="decimal"
          value={form.protein}
          onChange={(event) => onChange("protein", event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
          placeholder="25"
        />
      </label>

      <label className="min-w-0 space-y-2 text-sm text-[var(--app-text)]">
        <span className={NUTRITION_LABEL_CLASS}>Carboidrati</span>
        <input
          inputMode="decimal"
          value={form.carbs}
          onChange={(event) => onChange("carbs", event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
          placeholder="48"
        />
      </label>

      <label className="min-w-0 space-y-2 text-sm text-[var(--app-text)]">
        <span className={NUTRITION_LABEL_CLASS}>Grassi</span>
        <input
          inputMode="decimal"
          value={form.fat}
          onChange={(event) => onChange("fat", event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
          placeholder="14"
        />
      </label>
    </div>
  );
}

function EstimatePreview({
  estimate,
  mealType,
}: {
  estimate: FoodEstimate;
  mealType: MealType;
}) {
  const quantityLabel = getQuantityLabel(
    estimate.quantityValue,
    estimate.quantityUnit
  );

  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--app-text)]">
            {estimate.name}
          </p>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Salvato in {getMealTypeLabel(mealType)}
          </p>
        </div>
        <div className="rounded-full border border-[var(--app-primary-border)] bg-[rgba(208,216,43,0.12)] px-3 py-1 text-xs font-semibold text-[var(--app-primary)]">
          Affidabilità {getConfidenceLabel(estimate.confidence)}
        </div>
      </div>

      <div className={`mt-4 ${NUTRITION_GRID_CLASS}`}>
        <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
          <p className={NUTRITION_PREVIEW_LABEL_CLASS}>
            Calorie
          </p>
          <p className="font-metrics mt-2 text-lg font-semibold text-[var(--app-text)]">
            {formatNutritionNumber(estimate.calories)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
          <p className={NUTRITION_PREVIEW_LABEL_CLASS}>
            Proteine
          </p>
          <p className="font-metrics mt-2 text-lg font-semibold text-[var(--app-text)]">
            {formatNutritionNumber(estimate.protein)} g
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
          <p className={NUTRITION_PREVIEW_LABEL_CLASS}>
            Carboidrati
          </p>
          <p className="font-metrics mt-2 text-lg font-semibold text-[var(--app-text)]">
            {formatNutritionNumber(estimate.carbs)} g
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
          <p className={NUTRITION_PREVIEW_LABEL_CLASS}>
            Grassi
          </p>
          <p className="font-metrics mt-2 text-lg font-semibold text-[var(--app-text)]">
            {formatNutritionNumber(estimate.fat)} g
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-[var(--app-muted)]">
        <p>Porzione stimata: {estimate.portionDescription}</p>
        {quantityLabel ? <p>Quantità stimata: {quantityLabel}</p> : null}
        {estimate.brand ? <p>Marca stimata: {estimate.brand}</p> : null}
      </div>

      {estimate.confidence === "low" ? (
        <div className="mt-4 rounded-2xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          Controlla i valori prima di salvare.
        </div>
      ) : null}

      {estimate.assumptions.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="text-sm font-semibold text-[var(--app-text)]">Assunzioni usate</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--app-muted)]">
            {estimate.assumptions.map((assumption) => (
              <li key={assumption}>• {assumption}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MealEntryForm({
  date,
  mealType,
  activeTab,
  onTabChange,
  onSaved,
}: MealEntryFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(getResetState(mealType));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<FoodEstimate | null>(null);
  const [showNutritionFields, setShowNutritionFields] = useState(false);
  const isBarcodeTabActive = activeTab === "barcode";

  function applyEstimate(nextEstimate: FoodEstimate) {
    const estimatedNotes = buildEstimateNotes(nextEstimate);

    setEstimate(nextEstimate);
    setShowNutritionFields(true);
    setForm((current) => ({
      ...current,
      mealType,
      name: nextEstimate.name || current.name,
      quantityValue:
        nextEstimate.quantityValue !== null
          ? String(nextEstimate.quantityValue)
          : current.quantityValue,
      quantityUnit: nextEstimate.quantityUnit ?? current.quantityUnit,
      brand: nextEstimate.brand ?? current.brand,
      calories: String(nextEstimate.calories),
      protein: String(nextEstimate.protein),
      carbs: String(nextEstimate.carbs),
      fat: String(nextEstimate.fat),
      notes: current.notes.trim()
        ? current.notes
        : estimatedNotes.slice(0, MEAL_NOTES_MAX_LENGTH),
      nutritionSource: "ai_estimate",
    }));
  }

  function applyBarcodeProduct(payload: {
    name: string;
    brand: string;
    quantityValue: string;
    quantityUnit: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    notes: string;
  }) {
    setEstimate(null);
    setEstimateError(null);
    setSaveError(null);
    setShowNutritionFields(true);
    setForm((current) => ({
      ...current,
      mealType,
      name: payload.name,
      brand: payload.brand,
      quantityValue: payload.quantityValue,
      quantityUnit: payload.quantityUnit,
      calories: payload.calories,
      protein: payload.protein,
      carbs: payload.carbs,
      fat: payload.fat,
      notes: current.notes.trim() ? current.notes : payload.notes,
      nutritionSource: "manual",
    }));
    onTabChange("manual");
  }

  async function requestEstimate(body: Record<string, string | number | undefined>) {
    const response = await fetch("/api/nutrition/estimate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        mealType,
      }),
    });
    const payload = await parseApiResponse<EstimateApiResponse>(response);

    if (!response.ok || !payload.ok) {
      setEstimateError(
        !payload.ok
          ? payload.message ?? "Impossibile stimare il pasto."
          : "Impossibile stimare il pasto."
      );
      return null;
    }

    return payload.estimate;
  }

  async function handleDescriptionEstimate() {
    const normalizedDescription = description.trim();

    if (!normalizedDescription) {
      setEstimateError("Descrivi il pasto prima di avviare la stima.");
      return;
    }

    setEstimateError(null);
    setSaveError(null);
    setEstimating(true);

    try {
      const nextEstimate = await requestEstimate({
        description: normalizedDescription,
      });

      if (!nextEstimate) {
        return;
      }

      applyEstimate(nextEstimate);
    } catch {
      setEstimateError("Errore di rete durante la stima del pasto.");
    } finally {
      setEstimating(false);
    }
  }

  async function handleManualEstimate() {
    const name = form.name.trim();
    const quantityValue = form.quantityValue.trim();
    const quantityUnit = form.quantityUnit;

    if (!name || !quantityValue || !quantityUnit) {
      setEstimateError(
        "Inserisci alimento, quantità e unità prima di stimare il pasto."
      );
      return;
    }

    setEstimateError(null);
    setSaveError(null);
    setEstimating(true);

    try {
      const nextEstimate = await requestEstimate({
        name,
        quantityValue,
        quantityUnit,
        brand: form.brand.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      if (!nextEstimate) {
        return;
      }

      applyEstimate(nextEstimate);
    } catch {
      setEstimateError("Errore di rete durante la stima del pasto.");
    } finally {
      setEstimating(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasNutritionValues(form) && form.nutritionSource !== "ai_estimate") {
      setSaveError("Stima o inserisci i valori nutrizionali prima di salvare.");
      setShowNutritionFields(true);
      return;
    }

    const mealInput = validateMealInput(form);

    if (!mealInput.ok) {
      setSaveError(mealInput.message);
      setShowNutritionFields(true);
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
          quantityValue: mealInput.value.quantityValue,
          quantityUnit: mealInput.value.quantityUnit,
          brand: mealInput.value.brand,
          nutritionSource:
            mealInput.value.nutritionSource ??
            (estimate ? "ai_estimate" : "manual"),
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

      setForm(getResetState(mealType));
      setDescription("");
      setEstimate(null);
      setShowNutritionFields(false);
      if (onSaved) {
        onSaved();
        return;
      }
      router.refresh();
    } catch {
      setSaveError("Errore di rete durante il salvataggio del pasto.");
    } finally {
      setSaving(false);
    }
  }

  function updateNutritionField(
    field: "calories" | "protein" | "carbs" | "fat",
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
      nutritionSource: "manual",
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
          Pasto selezionato
        </p>
        <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
          {getMealTypeLabel(mealType)}
        </p>
      </div>

      {estimateError ? (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {estimateError}
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {saveError}
        </div>
      ) : null}

      {activeTab === "estimate" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
              Descrivi cosa hai mangiato
            </h2>
            <p className="mt-2 text-sm text-[var(--app-muted)]">
              La stima è orientativa. Puoi correggere i valori prima di salvare.
            </p>
          </div>

          <label className="block space-y-2 text-sm text-[var(--app-text)]">
            <span className="font-medium text-[var(--app-muted)]">Descrizione libera</span>
            <textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-[26px] border border-white/10 bg-white/[0.03] px-4 py-4 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
              placeholder="Ho mangiato 80 g di pasta al pomodoro, un cucchiaio d'olio e una mela"
            />
          </label>

          <button
            type="button"
            disabled={estimating || saving}
            onClick={handleDescriptionEstimate}
            className="inline-flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-[var(--app-primary)] px-5 py-3 font-semibold text-[var(--app-bg)] shadow-[0_14px_32px_rgba(208,216,43,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {estimating ? "Stima in corso..." : "Stima pasto"}
          </button>

          {estimate ? (
            <>
              <EstimatePreview estimate={estimate} mealType={mealType} />

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03]">
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
                  <NutritionFields form={form} onChange={updateNutritionField} />
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onTabChange("manual")}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-[var(--app-text)] transition-colors hover:bg-white/[0.05]"
                >
                  Correggi a mano
                </button>
                <button
                  type="submit"
                  disabled={saving || estimating}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[var(--app-primary)] px-5 py-3 font-semibold text-[var(--app-bg)] shadow-[0_14px_32px_rgba(208,216,43,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Salvataggio..." : "Salva pasto"}
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {activeTab === "manual" ? (
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--app-text)]">
              <span className="font-medium text-[var(--app-muted)]">
                Nome pasto o alimento
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
                placeholder="Esempio: Yogurt e frutta"
              />
            </label>

            <label className="space-y-2 text-sm text-[var(--app-text)]">
              <span className="font-medium text-[var(--app-muted)]">Marca</span>
              <input
                value={form.brand}
                maxLength={MEAL_BRAND_MAX_LENGTH}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    brand: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
                placeholder="Opzionale"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <label className="space-y-2 text-sm text-[var(--app-text)]">
              <span className="font-medium text-[var(--app-muted)]">Quantità</span>
              <input
                inputMode="decimal"
                value={form.quantityValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quantityValue: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
                placeholder="Esempio: 120"
              />
            </label>

            <label className="space-y-2 text-sm text-[var(--app-text)]">
              <span className="font-medium text-[var(--app-muted)]">Unità</span>
              <select
                value={form.quantityUnit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quantityUnit: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-primary-border)]"
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

          <label className="block space-y-2 text-sm text-[var(--app-text)]">
            <span className="font-medium text-[var(--app-muted)]">Note opzionali</span>
            <textarea
              rows={4}
              value={form.notes}
              maxLength={MEAL_NOTES_MAX_LENGTH}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              className="w-full rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
              placeholder="Dettagli utili sulla preparazione o sulla porzione"
            />
          </label>

          <div className="rounded-[24px] border border-[var(--app-primary-border)] bg-[linear-gradient(160deg,rgba(208,216,43,0.12),rgba(208,216,43,0.03))] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--app-text)]">
                  Stima AI
                </p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Completa i campi essenziali e ottieni una stima rapida.
                </p>
              </div>
              <button
                type="button"
                disabled={estimating || saving}
                onClick={handleManualEstimate}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[var(--app-primary)] px-5 py-3 font-semibold text-[var(--app-bg)] shadow-[0_12px_28px_rgba(208,216,43,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {estimating ? "Stima in corso..." : "Stima AI"}
              </button>
            </div>
          </div>

          {estimate ? <EstimatePreview estimate={estimate} mealType={mealType} /> : null}

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03]">
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
              <NutritionFields form={form} onChange={updateNutritionField} />
            ) : null}
          </div>

          <button
            type="submit"
            disabled={saving || estimating}
            className="inline-flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-[var(--app-primary)] px-5 py-3 font-semibold text-[var(--app-bg)] shadow-[0_14px_32px_rgba(208,216,43,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Salvataggio..." : "Salva pasto"}
          </button>
        </section>
      ) : null}

      {isBarcodeTabActive ? (
        <BarcodeScanner
          active={isBarcodeTabActive}
          disabled={saving || estimating}
          onInsertManual={() => onTabChange("manual")}
          onUseProduct={applyBarcodeProduct}
        />
      ) : null}
    </form>
  );
}
