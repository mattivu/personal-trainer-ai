import "server-only";
import type { MealEntry, NutritionProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mergeOnboardingAnswers } from "@/lib/training-engine/onboarding-profile";
import { calculateNutritionTargets } from "./calculate-targets";

type MealEntrySummary = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DailyNutritionData = {
  date: string;
  meals: MealEntry[];
  summary: MealEntrySummary;
};

function formatDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
  }).format(date);
}

function getRomeOffset(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    timeZoneName: "longOffset",
    hour: "2-digit",
  });
  const offsetPart = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!offsetPart) {
    return "+00:00";
  }

  const normalized = offsetPart.replace("GMT", "");

  if (/^[+-]\d{1,2}$/.test(normalized)) {
    const sign = normalized.startsWith("-") ? "-" : "+";
    const hours = normalized.slice(1).padStart(2, "0");
    return `${sign}${hours}:00`;
  }

  if (/^[+-]\d{1,2}:\d{2}$/.test(normalized)) {
    const sign = normalized.startsWith("-") ? "-" : "+";
    const [hours, minutes] = normalized.slice(1).split(":");
    return `${sign}${hours.padStart(2, "0")}:${minutes}`;
  }

  return "+00:00";
}

export function getDateRangeForLocalDay(dateKey?: string) {
  const date = dateKey ? new Date(`${dateKey}T12:00:00Z`) : new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const normalizedDateKey = `${year}-${month}-${day}`;
  const offset = getRomeOffset(new Date(`${normalizedDateKey}T12:00:00Z`));

  return {
    dateKey: normalizedDateKey,
    start: new Date(`${normalizedDateKey}T00:00:00${offset}`),
    end: new Date(`${normalizedDateKey}T23:59:59.999${offset}`),
  };
}

function sumMeals(meals: Pick<MealEntry, "calories" | "protein" | "carbs" | "fat">[]) {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fat: totals.fat + meal.fat,
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );
}

export async function getMergedOnboardingAnswers(userId: number) {
  const answers = await prisma.onboardingAnswer.findMany({
    where: {
      userId,
    },
    select: {
      answersJson: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  return mergeOnboardingAnswers(answers.map((entry) => entry.answersJson));
}

export async function getOrCreateNutritionProfile(userId: number) {
  const existingProfile = await prisma.nutritionProfile.findUnique({
    where: {
      userId,
    },
  });

  if (existingProfile) {
    return {
      profile: existingProfile,
      calculation: null,
    };
  }

  const [answers, userProfile] = await Promise.all([
    getMergedOnboardingAnswers(userId),
    prisma.userProfile.findUnique({
      where: {
        userId,
      },
    }),
  ]);

  const calculation = calculateNutritionTargets({
    answers,
    profile: userProfile,
  });

  const profile = await prisma.nutritionProfile.create({
    data: {
      userId,
      goal: calculation.goal,
      estimatedTdee: calculation.estimatedTdee,
      calorieTarget: calculation.calorieTarget,
      proteinTarget: calculation.proteinTarget,
      carbsTarget: calculation.carbsTarget,
      fatTarget: calculation.fatTarget,
      calculationMethod: calculation.calculationMethod,
    },
  });

  return {
    profile,
    calculation,
  };
}

export async function getDailyNutritionData(
  userId: number,
  dateKey?: string
): Promise<DailyNutritionData> {
  const range = getDateRangeForLocalDay(dateKey);
  const meals = await prisma.mealEntry.findMany({
    where: {
      userId,
      date: {
        gte: range.start,
        lte: range.end,
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  return {
    date: range.dateKey,
    meals,
    summary: sumMeals(meals),
  };
}

export function getNutritionDailySummary(input: {
  profile: Pick<
    NutritionProfile,
    "calorieTarget" | "proteinTarget" | "carbsTarget" | "fatTarget"
  >;
  meals: Pick<MealEntry, "calories" | "protein" | "carbs" | "fat">[];
}) {
  const registered = sumMeals(input.meals);

  return {
    registered,
    remainingCalories: Math.max(
      input.profile.calorieTarget - registered.calories,
      0
    ),
    progressPercent: Math.min(
      Math.round((registered.calories / input.profile.calorieTarget) * 100),
      100
    ),
  };
}

export function getMealEntryDateKey(date: Date) {
  return formatDateKey(date);
}
