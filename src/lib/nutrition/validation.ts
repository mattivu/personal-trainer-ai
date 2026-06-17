import type { MealType } from "@prisma/client";

export const MEAL_NOTES_MAX_LENGTH = 500;

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
] as const satisfies readonly MealType[];

type MealInput = {
  mealType?: unknown;
  name?: unknown;
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

type NormalizedMealNotesResult =
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
      error: "invalid_type" | "too_long";
    };

export function normalizeMealNotes(value: unknown): NormalizedMealNotesResult {
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

  if (normalized.length > MEAL_NOTES_MAX_LENGTH) {
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

export function parseRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function parseNonNegativeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && MEAL_TYPES.includes(value as MealType);
}

export function validateMealInput(input: MealInput): ValidatedMealInput {
  const mealType = input.mealType;
  const name = parseRequiredString(input.name);
  const calories = parseNonNegativeInteger(input.calories);
  const protein = parseNonNegativeInteger(input.protein);
  const carbs = parseNonNegativeInteger(input.carbs);
  const fat = parseNonNegativeInteger(input.fat);
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

  if (calories === null || protein === null || carbs === null || fat === null) {
    return {
      ok: false,
      message:
        "Calorie, proteine, carboidrati e grassi devono essere numeri interi maggiori o uguali a 0.",
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
      calories,
      protein,
      carbs,
      fat,
      notes: notes.value,
    },
  };
}
