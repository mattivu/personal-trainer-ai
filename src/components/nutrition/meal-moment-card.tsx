import type { MealEntry, MealType } from "@prisma/client";
import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { formatNutritionNumber } from "@/lib/nutrition/meals";

type MealMomentCardProps = {
  mealType: MealType;
  label: string;
  meals: MealEntry[];
  href: string;
};

const MEAL_TYPE_ACCENTS: Record<MealType, string> = {
  breakfast: "from-[rgba(208,216,43,0.28)] to-[rgba(208,216,43,0.04)]",
  lunch: "from-[rgba(117,201,255,0.18)] to-[rgba(117,201,255,0.03)]",
  dinner: "from-[rgba(247,249,250,0.12)] to-transparent",
  snack: "from-[rgba(208,216,43,0.18)] to-transparent",
  other: "from-[rgba(247,249,250,0.12)] to-transparent",
};

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: "☕️",
  lunch: "🍝",
  dinner: "🍽️",
  snack: "🍎",
  other: "•",
};

function getMealPreview(meals: MealEntry[]) {
  if (meals.length === 0) {
    return "Nessun pasto";
  }

  const names = meals.slice(0, 2).map((meal) => meal.name.trim()).filter(Boolean);
  const extraMeals = meals.length - names.length;

  if (extraMeals > 0) {
    return `${names.join(", ")} +${extraMeals}`;
  }

  return names.join(", ");
}

export function MealMomentCard({
  mealType,
  label,
  meals,
  href,
}: MealMomentCardProps) {
  const totalCalories = meals.reduce((total, meal) => total + meal.calories, 0);
  const preview = getMealPreview(meals);

  return (
    <AppCard className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--app-border)] bg-gradient-to-br ${MEAL_TYPE_ACCENTS[mealType]}`}
        >
          <span className="text-xl leading-none text-[var(--app-text)]" aria-hidden="true">
            {MEAL_TYPE_ICONS[mealType]}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
              {label}
            </h3>
            <p className="mt-1 font-metrics text-sm text-[var(--app-muted)]">
              {meals.length > 0 ? `${formatNutritionNumber(totalCalories)} kcal` : "0 kcal"}
            </p>
            <p className="mt-2 truncate text-sm text-[var(--app-muted)]">{preview}</p>
          </div>

          <Link
            href={href}
            scroll={false}
            aria-label={`Aggiungi pasto a ${label}`}
            className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-full border border-[var(--app-primary-border)] bg-[var(--app-primary)] text-[var(--app-bg)] shadow-[0_12px_24px_rgba(208,216,43,0.18)] transition-transform duration-150 hover:-translate-y-0.5"
          >
            <span className="text-2xl leading-none">+</span>
          </Link>
        </div>
      </div>
    </AppCard>
  );
}
