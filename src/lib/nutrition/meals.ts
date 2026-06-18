import type { MealType } from "@prisma/client";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Colazione",
  lunch: "Pranzo",
  dinner: "Cena",
  snack: "Spuntino",
  other: "Altro",
};

export const MEAL_TYPE_OPTIONS = [
  { value: "breakfast", label: "Colazione" },
  { value: "lunch", label: "Pranzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Spuntino" },
  { value: "other", label: "Altro" },
] as const satisfies ReadonlyArray<{ value: MealType; label: string }>;

export const QUANTITY_UNIT_VALUES = [
  "g",
  "ml",
  "porzione",
  "pezzo",
  "altro",
] as const;

export const QUANTITY_UNIT_OPTIONS = [
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "porzione", label: "Porzione" },
  { value: "pezzo", label: "Pezzo" },
  { value: "altro", label: "Altro" },
] as const satisfies ReadonlyArray<{
  value: (typeof QUANTITY_UNIT_VALUES)[number];
  label: string;
}>;

export function getMealTypeLabel(mealType: MealType) {
  return MEAL_TYPE_LABELS[mealType];
}

export function getQuantityLabel(
  quantityValue: number | null | undefined,
  quantityUnit: string | null | undefined
) {
  if (typeof quantityValue !== "number" || !Number.isFinite(quantityValue) || quantityValue <= 0) {
    return null;
  }

  const formattedValue = new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: quantityValue % 1 === 0 ? 0 : 1,
  }).format(quantityValue);

  if (!quantityUnit) {
    return formattedValue;
  }

  return `${formattedValue} ${quantityUnit}`;
}

export function formatNutritionNumber(value: number) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}
