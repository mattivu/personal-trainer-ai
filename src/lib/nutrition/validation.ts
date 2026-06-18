import type { MealType } from "@prisma/client";
import { QUANTITY_UNIT_VALUES } from "./meals";

export const MEAL_NOTES_MAX_LENGTH = 500;
export const MEAL_BRAND_MAX_LENGTH = 100;
export const MEAL_QUANTITY_MAX_VALUE = 10000;

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
] as const satisfies readonly MealType[];

type QuantityUnit = (typeof QUANTITY_UNIT_VALUES)[number];
type NutritionSource = "manual" | "ai_estimate";

type MealInput = {
  mealType?: unknown;
  name?: unknown;
  quantityValue?: unknown;
  quantityUnit?: unknown;
  brand?: unknown;
  nutritionSource?: unknown;
  calories?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
  notes?: unknown;
};

type ValidatedMealInput =
  | {
      ok: true;
      value: {
        mealType: MealType;
        name: string;
        quantityValue: number | null;
        quantityUnit: QuantityUnit | null;
        brand: string | null;
        nutritionSource: NutritionSource | null;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        notes: string | null;
      };
    }
  | {
      ok: false;
      message: string;
    };

type NormalizedStringResult =
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
      error: "invalid_type" | "too_long";
    };

function normalizeOptionalString(
  value: unknown,
  maxLength: number
): NormalizedStringResult {
  if (value === undefined || value === null) {
    return {
      ok: true,
      value: null,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      error: "invalid_type",
    };
  }

  const normalized = value.trim();

  if (!normalized) {
    return {
      ok: true,
      value: null,
    };
  }

  if (normalized.length > maxLength) {
    return {
      ok: false,
      error: "too_long",
    };
  }

  return {
    ok: true,
    value: normalized,
  };
}

export function normalizeMealNotes(value: unknown): NormalizedStringResult {
  return normalizeOptionalString(value, MEAL_NOTES_MAX_LENGTH);
}

export function normalizeMealBrand(value: unknown): NormalizedStringResult {
  return normalizeOptionalString(value, MEAL_BRAND_MAX_LENGTH);
}

export function parseRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parseNonNegativeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseOptionalPositiveQuantity(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true as const,
      value: null,
    };
  }

  const parsed = parseNonNegativeNumber(value);

  if (parsed === null || parsed <= 0) {
    return {
      ok: false as const,
      message: "La quantità deve essere maggiore di 0.",
    };
  }

  if (parsed > MEAL_QUANTITY_MAX_VALUE) {
    return {
      ok: false as const,
      message: `La quantità deve essere inferiore o uguale a ${MEAL_QUANTITY_MAX_VALUE}.`,
    };
  }

  return {
    ok: true as const,
    value: parsed,
  };
}

function parseOptionalQuantityUnit(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true as const,
      value: null,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false as const,
      message: "L'unità non è valida.",
    };
  }

  const normalized = value.trim() as QuantityUnit;

  if (!normalized) {
    return {
      ok: true as const,
      value: null,
    };
  }

  if (!QUANTITY_UNIT_VALUES.includes(normalized)) {
    return {
      ok: false as const,
      message: "Seleziona un'unità valida.",
    };
  }

  return {
    ok: true as const,
    value: normalized,
  };
}

function parseOptionalNutritionSource(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true as const,
      value: null,
    };
  }

  if (value === "manual" || value === "ai_estimate") {
    return {
      ok: true as const,
      value: value as NutritionSource,
    };
  }

  return {
    ok: false as const,
    message: "Origine dei valori nutrizionali non valida.",
  };
}

export function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && MEAL_TYPES.includes(value as MealType);
}

export function validateMealInput(input: MealInput): ValidatedMealInput {
  const mealType = input.mealType;
  const name = parseRequiredString(input.name);
  const quantityValue = parseOptionalPositiveQuantity(input.quantityValue);
  const quantityUnit = parseOptionalQuantityUnit(input.quantityUnit);
  const brand = normalizeMealBrand(input.brand);
  const nutritionSource = parseOptionalNutritionSource(input.nutritionSource);
  const calories = parseNonNegativeNumber(input.calories);
  const protein = parseNonNegativeNumber(input.protein);
  const carbs = parseNonNegativeNumber(input.carbs);
  const fat = parseNonNegativeNumber(input.fat);
  const notes = normalizeMealNotes(input.notes);

  if (!isMealType(mealType)) {
    return {
      ok: false,
      message: "Seleziona un tipo pasto valido.",
    };
  }

  if (!name) {
    return {
      ok: false,
      message: "Il nome del pasto è obbligatorio.",
    };
  }

  if (!quantityValue.ok) {
    return {
      ok: false,
      message: quantityValue.message,
    };
  }

  if (!quantityUnit.ok) {
    return {
      ok: false,
      message: quantityUnit.message,
    };
  }

  if (!brand.ok) {
    return {
      ok: false,
      message:
        brand.error === "too_long"
          ? `La marca può contenere al massimo ${MEAL_BRAND_MAX_LENGTH} caratteri.`
          : "La marca non è valida.",
    };
  }

  if (!nutritionSource.ok) {
    return {
      ok: false,
      message: nutritionSource.message,
    };
  }

  if (calories === null || protein === null || carbs === null || fat === null) {
    return {
      ok: false,
      message: "Stima o inserisci i valori nutrizionali prima di salvare.",
    };
  }

  if (!notes.ok) {
    return {
      ok: false,
      message:
        notes.error === "too_long"
          ? `Le note possono contenere al massimo ${MEAL_NOTES_MAX_LENGTH} caratteri.`
          : "Le note non sono valide.",
    };
  }

  return {
    ok: true,
    value: {
      mealType,
      name,
      quantityValue: quantityValue.value,
      quantityUnit: quantityUnit.value,
      brand: brand.value,
      nutritionSource: nutritionSource.value,
      calories,
      protein,
      carbs,
      fat,
      notes: notes.value,
    },
  };
}
