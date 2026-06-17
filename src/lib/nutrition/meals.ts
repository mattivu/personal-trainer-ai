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

export function getMealTypeLabel(mealType: MealType) {
  return MEAL_TYPE_LABELS[mealType];
}
