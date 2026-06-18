import "server-only";

import { prisma } from "@/lib/prisma";
import {
  calculateBodyWeightSummary,
  type BodyWeightTrend,
} from "@/lib/body-weight-shared";
import { estimateDailyActivityCalories } from "@/lib/nutrition/activity-calories";
import {
  getDateRangeForLocalDay,
  getMealEntryDateKey,
  getMergedOnboardingAnswers,
  getOrCreateNutritionProfile,
} from "@/lib/nutrition/profile";
import { getWeekEnd, getWeekStart } from "@/lib/workout-schedule";

export type NutritionWeeklyReviewSignal =
  | "Dati insufficienti"
  | "Buona continuita"
  | "Pochi pasti registrati"
  | "Calorie spesso sotto target"
  | "Calorie spesso sopra target"
  | "Proteine sotto target"
  | "Bilancio coerente con il target"
  | "Peso stabile"
  | "Peso in calo"
  | "Peso in aumento"
  | "Attivita alta questa settimana"
  | "Stime frequenti: controlla le porzioni";

export type NutritionWeeklyReviewStatus =
  | "Settimana coerente"
  | "Dati insufficienti"
  | "Calorie poco controllate"
  | "Proteine da migliorare"
  | "Target da osservare"
  | "Buona continuita";

export type NutritionWeeklyReviewRecommendation =
  | "Continua cosi"
  | "Registra piu giorni prima di valutare"
  | "Controlla meglio le porzioni"
  | "Alza leggermente le proteine"
  | "Evita tagli calorici troppo aggressivi"
  | "Osserva ancora il trend peso"
  | "Mantieni il target per un'altra settimana"
  | "Valuta il target solo dopo piu dati";

type ReviewDay = {
  dateKey: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
  hasMeals: boolean;
  targetCalories: number;
  targetProtein: number;
  activityCalories: number;
  calorieDifference: number;
  indicativeBalance: number;
};

export type NutritionWeeklyReview = {
  week: {
    start: Date;
    end: Date;
    analyzedEnd: Date;
    analyzedDays: number;
    isCurrentWeek: boolean;
  };
  metrics: {
    daysAnalyzed: number;
    daysWithMeals: number;
    averageCalorieTarget: number;
    averageCaloriesConsumed: number;
    averageCalorieDifference: number;
    totalEstimatedActivityCalories: number;
    averageEstimatedActivityCalories: number;
    averageIndicativeBalance: number;
    averageProtein: number;
    averageCarbs: number;
    averageFat: number;
    daysAboveTarget: number;
    daysBelowTarget: number;
    daysFarBelowTarget: number;
    daysFarAboveTarget: number;
    totalMeals: number;
    aiEstimatedMealPercent: number | null;
    latestWeightKg: number | null;
    weightChange7DaysKg: number | null;
    weightTrend: BodyWeightTrend;
  };
  days: ReviewDay[];
  status: NutritionWeeklyReviewStatus;
  signals: NutritionWeeklyReviewSignal[];
  recommendation: NutritionWeeklyReviewRecommendation;
  cautionMessage: string | null;
};

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseWeightKg(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getDayCountInclusive(start: Date, end: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1);
}

function getExtremeRestrictionSignal(notes: string[]) {
  const text = normalizeText(notes.join(" "));

  if (!text) {
    return false;
  }

  return [
    /\bdigiun/,
    /\bsalto spesso i pasti\b/,
    /\bsaltare i pasti\b/,
    /\bnon mangio\b/,
    /\bmangio pochissim/,
    /\btaglio drastic/,
    /\brestrizion/,
    /\babbuff/,
    /\bvomit/,
    /\blassativ/,
  ].some((pattern) => pattern.test(text));
}

function getWeightSignal(trend: BodyWeightTrend): NutritionWeeklyReviewSignal | null {
  switch (trend) {
    case "stabile":
      return "Peso stabile";
    case "in_calo":
      return "Peso in calo";
    case "in_aumento":
      return "Peso in aumento";
    default:
      return null;
  }
}

function buildSignals(input: {
  daysAnalyzed: number;
  daysWithMeals: number;
  totalMeals: number;
  averageProtein: number;
  proteinTarget: number;
  daysBelowTarget: number;
  daysAboveTarget: number;
  daysFarBelowTarget: number;
  daysFarAboveTarget: number;
  averageCalorieDifference: number;
  totalEstimatedActivityCalories: number;
  averageEstimatedActivityCalories: number;
  aiEstimatedMealPercent: number | null;
  weightTrend: BodyWeightTrend;
}) {
  const signals: NutritionWeeklyReviewSignal[] = [];
  const sufficientDays = input.daysWithMeals >= 3;

  if (!sufficientDays) {
    signals.push("Dati insufficienti");
  }

  if (input.daysWithMeals >= Math.min(input.daysAnalyzed, 5)) {
    signals.push("Buona continuita");
  }

  if (input.totalMeals < Math.max(4, input.daysAnalyzed * 2)) {
    signals.push("Pochi pasti registrati");
  }

  if (
    input.daysBelowTarget >= Math.max(2, Math.ceil(input.daysWithMeals * 0.6)) &&
    input.daysWithMeals > 0
  ) {
    signals.push("Calorie spesso sotto target");
  }

  if (
    input.daysAboveTarget >= Math.max(2, Math.ceil(input.daysWithMeals * 0.6)) &&
    input.daysWithMeals > 0
  ) {
    signals.push("Calorie spesso sopra target");
  }

  if (
    sufficientDays &&
    input.proteinTarget > 0 &&
    input.averageProtein < input.proteinTarget * 0.9
  ) {
    signals.push("Proteine sotto target");
  }

  if (
    sufficientDays &&
    Math.abs(input.averageCalorieDifference) <= 150 &&
    !signals.includes("Calorie spesso sotto target") &&
    !signals.includes("Calorie spesso sopra target")
  ) {
    signals.push("Bilancio coerente con il target");
  }

  const weightSignal = getWeightSignal(input.weightTrend);

  if (weightSignal) {
    signals.push(weightSignal);
  }

  if (
    input.totalEstimatedActivityCalories >= 1800 ||
    (input.daysAnalyzed > 0 && input.averageEstimatedActivityCalories >= 300)
  ) {
    signals.push("Attivita alta questa settimana");
  }

  if (input.aiEstimatedMealPercent !== null && input.aiEstimatedMealPercent >= 50) {
    signals.push("Stime frequenti: controlla le porzioni");
  }

  if (input.daysFarBelowTarget >= 2 && !signals.includes("Calorie spesso sotto target")) {
    signals.push("Calorie spesso sotto target");
  }

  if (input.daysFarAboveTarget >= 2 && !signals.includes("Calorie spesso sopra target")) {
    signals.push("Calorie spesso sopra target");
  }

  return signals;
}

function buildStatus(input: {
  signals: NutritionWeeklyReviewSignal[];
  daysWithMeals: number;
  daysAnalyzed: number;
  daysFarBelowTarget: number;
  daysFarAboveTarget: number;
}) {
  if (input.daysWithMeals < 3) {
    return "Dati insufficienti" as const;
  }

  if (
    input.signals.includes("Calorie spesso sotto target") ||
    input.signals.includes("Calorie spesso sopra target") ||
    input.daysFarBelowTarget >= 2 ||
    input.daysFarAboveTarget >= 2
  ) {
    return "Calorie poco controllate" as const;
  }

  if (input.signals.includes("Proteine sotto target")) {
    return "Proteine da migliorare" as const;
  }

  if (
    input.signals.includes("Buona continuita") &&
    input.signals.includes("Bilancio coerente con il target")
  ) {
    return "Settimana coerente" as const;
  }

  if (input.signals.includes("Buona continuita")) {
    return "Buona continuita" as const;
  }

  if (input.daysWithMeals < input.daysAnalyzed) {
    return "Target da osservare" as const;
  }

  return "Settimana coerente" as const;
}

function buildRecommendation(input: {
  status: NutritionWeeklyReviewStatus;
  signals: NutritionWeeklyReviewSignal[];
  weightTrend: BodyWeightTrend;
  daysFarBelowTarget: number;
}) {
  if (input.status === "Dati insufficienti") {
    return "Registra piu giorni prima di valutare" as const;
  }

  if (
    input.signals.includes("Stime frequenti: controlla le porzioni") &&
    !input.signals.includes("Proteine sotto target")
  ) {
    return "Controlla meglio le porzioni" as const;
  }

  if (input.signals.includes("Proteine sotto target")) {
    return "Alza leggermente le proteine" as const;
  }

  if (input.daysFarBelowTarget >= 2) {
    return "Evita tagli calorici troppo aggressivi" as const;
  }

  if (input.weightTrend === "dati_insufficienti") {
    return "Osserva ancora il trend peso" as const;
  }

  if (input.status === "Calorie poco controllate" || input.status === "Target da osservare") {
    return "Valuta il target solo dopo piu dati" as const;
  }

  if (input.status === "Buona continuita") {
    return "Mantieni il target per un'altra settimana" as const;
  }

  return "Continua cosi" as const;
}

export async function getNutritionWeeklyReviewForUser(
  userId: number
): Promise<NutritionWeeklyReview> {
  const now = new Date();
  const todayRange = getDateRangeForLocalDay();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const analyzedEnd = todayRange.end < weekEnd ? todayRange.end : weekEnd;
  const analyzedDays = getDayCountInclusive(weekStart, analyzedEnd);
  const isCurrentWeek = analyzedEnd.getTime() < weekEnd.getTime();

  const [nutritionProfileResult, answers, userProfile, meals, bodyWeightEntries, workoutLogs] =
    await Promise.all([
      getOrCreateNutritionProfile(userId),
      getMergedOnboardingAnswers(userId),
      prisma.userProfile.findUnique({
        where: {
          userId,
        },
        select: {
          startingWeight: true,
        },
      }),
      prisma.mealEntry.findMany({
        where: {
          userId,
          date: {
            gte: weekStart,
            lte: analyzedEnd,
          },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      }),
      prisma.bodyWeightEntry.findMany({
        where: {
          userId,
        },
        orderBy: [{ date: "asc" }, { id: "asc" }],
      }),
      prisma.workoutLog.findMany({
        where: {
          userId,
          status: "completed",
          OR: [
            {
              completedAt: {
                gte: weekStart,
                lte: analyzedEnd,
              },
            },
            {
              completedAt: null,
              performedAt: {
                gte: weekStart,
                lte: analyzedEnd,
              },
            },
          ],
        },
        orderBy: [{ completedAt: "asc" }, { performedAt: "asc" }, { id: "asc" }],
        include: {
          workout: {
            select: {
              title: true,
              focus: true,
              estimatedMinutes: true,
              exercises: {
                select: {
                  name: true,
                  intensity: true,
                },
                orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
              },
            },
          },
          setLogs: {
            where: {
              completed: true,
            },
            select: {
              programExercise: {
                select: {
                  name: true,
                  intensity: true,
                },
              },
            },
          },
        },
      }),
    ]);

  const nutritionProfile = nutritionProfileResult.profile;
  const dayMap = new Map<string, ReviewDay>();

  for (let index = 0; index < analyzedDays; index += 1) {
    const date = new Date(weekStart.getTime());
    date.setDate(weekStart.getDate() + index);
    const dateKey = getMealEntryDateKey(date);

    dayMap.set(dateKey, {
      dateKey,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      mealCount: 0,
      hasMeals: false,
      targetCalories: nutritionProfile.calorieTarget,
      targetProtein: nutritionProfile.proteinTarget,
      activityCalories: 0,
      calorieDifference: 0,
      indicativeBalance: 0,
    });
  }

  for (const meal of meals) {
    const dateKey = getMealEntryDateKey(meal.date);
    const day = dayMap.get(dateKey);

    if (!day) {
      continue;
    }

    day.calories += meal.calories;
    day.protein += meal.protein;
    day.carbs += meal.carbs;
    day.fat += meal.fat;
    day.mealCount += 1;
      day.hasMeals = true;
  }

  const weightKg = parseWeightKg(answers.pesoKg) ?? userProfile?.startingWeight ?? null;
  const workoutLogsByDate = new Map<string, typeof workoutLogs>();

  for (const workoutLog of workoutLogs) {
    const referenceDate = workoutLog.completedAt ?? workoutLog.performedAt;
    const dateKey = getMealEntryDateKey(referenceDate);
    const currentLogs = workoutLogsByDate.get(dateKey) ?? [];
    currentLogs.push(workoutLog);
    workoutLogsByDate.set(dateKey, currentLogs);
  }

  for (const [dateKey, workoutEntries] of workoutLogsByDate.entries()) {
    const day = dayMap.get(dateKey);

    if (!day) {
      continue;
    }

    const estimate = estimateDailyActivityCalories({
      weightKg,
      workouts: workoutEntries.map((entry) => {
        const exerciseNames = Array.from(
          new Set(
            [
              ...entry.setLogs
                .map((setLog) => setLog.programExercise?.name ?? "")
                .filter(Boolean),
              ...(entry.workout?.exercises.map((exercise) => exercise.name) ?? []),
            ].map((value) => value.trim())
          )
        );
        const exerciseIntensityHints = Array.from(
          new Set(
            [
              ...entry.setLogs
                .map((setLog) => setLog.programExercise?.intensity ?? "")
                .filter(Boolean),
              ...(entry.workout?.exercises
                .map((exercise) => exercise.intensity ?? "")
                .filter(Boolean) ?? []),
            ].map((value) => value.trim())
          )
        );

        return {
          workoutName: entry.workout?.title ?? "Seduta completata",
          workoutFocus: entry.workout?.focus,
          estimatedMinutes: entry.workout?.estimatedMinutes ?? null,
          durationMinutes: entry.durationMinutes,
          perceivedEffort: entry.perceivedEffort,
          exerciseNames,
          exerciseIntensityHints,
        };
      }),
    });

    day.activityCalories = estimate.totalEstimatedActivityCalories;
  }

  const days = Array.from(dayMap.values()).map((day) => ({
    ...day,
    calories: round(day.calories),
    protein: round(day.protein),
    carbs: round(day.carbs),
    fat: round(day.fat),
    calorieDifference: round(day.calories - day.targetCalories),
    indicativeBalance: round(day.calories - day.targetCalories - day.activityCalories),
  }));

  const mealsWithNutritionSource = meals.filter(
    (meal) => typeof meal.nutritionSource === "string" && meal.nutritionSource.trim().length > 0
  );
  const aiEstimatedMeals = mealsWithNutritionSource.filter(
    (meal) => meal.nutritionSource === "ai_estimate"
  );
  const bodyWeightSummary = calculateBodyWeightSummary(bodyWeightEntries);
  const averageCalorieDifference = average(days.map((day) => day.calorieDifference));
  const averageIndicativeBalance = average(days.map((day) => day.indicativeBalance));
  const totalEstimatedActivityCalories = Math.round(
    days.reduce((sum, day) => sum + day.activityCalories, 0)
  );
  const averageEstimatedActivityCalories = average(days.map((day) => day.activityCalories));
  const daysWithMeals = days.filter((day) => day.hasMeals).length;
  const daysAboveTarget = days.filter((day) => day.hasMeals && day.calorieDifference > 120).length;
  const daysBelowTarget = days.filter((day) => day.hasMeals && day.calorieDifference < -120).length;
  const daysFarBelowTarget = days.filter(
    (day) =>
      day.hasMeals &&
      (day.calories <= Math.max(1200, day.targetCalories * 0.6) || day.calorieDifference <= -500)
  ).length;
  const daysFarAboveTarget = days.filter(
    (day) => day.hasMeals && (day.calorieDifference >= 500 || day.calories >= day.targetCalories * 1.25)
  ).length;

  const signals = buildSignals({
    daysAnalyzed: analyzedDays,
    daysWithMeals,
    totalMeals: meals.length,
    averageProtein: average(days.map((day) => day.protein)),
    proteinTarget: nutritionProfile.proteinTarget,
    daysBelowTarget,
    daysAboveTarget,
    daysFarBelowTarget,
    daysFarAboveTarget,
    averageCalorieDifference,
    totalEstimatedActivityCalories,
    averageEstimatedActivityCalories,
    aiEstimatedMealPercent:
      mealsWithNutritionSource.length > 0
        ? Math.round((aiEstimatedMeals.length / mealsWithNutritionSource.length) * 100)
        : null,
    weightTrend: bodyWeightSummary.trend,
  });

  const status = buildStatus({
    signals,
    daysWithMeals,
    daysAnalyzed: analyzedDays,
    daysFarBelowTarget,
    daysFarAboveTarget,
  });

  const recentWeekNotes = [
    ...meals.map((meal) => meal.notes ?? ""),
    ...bodyWeightEntries
      .filter((entry) => entry.date >= weekStart && entry.date <= analyzedEnd)
      .map((entry) => entry.notes ?? ""),
    JSON.stringify(answers),
  ].filter(Boolean);

  const cautionMessage =
    daysFarBelowTarget >= 2 ||
    (bodyWeightSummary.change7DaysKg !== null && bodyWeightSummary.change7DaysKg <= -1.2) ||
    getExtremeRestrictionSignal(recentWeekNotes)
      ? "Se stai riducendo molto il cibo, hai sintomi o hai un rapporto difficile con alimentazione e peso, confrontati con un professionista."
      : null;

  return {
    week: {
      start: weekStart,
      end: weekEnd,
      analyzedEnd,
      analyzedDays,
      isCurrentWeek,
    },
    metrics: {
      daysAnalyzed: analyzedDays,
      daysWithMeals,
      averageCalorieTarget: average(days.map((day) => day.targetCalories)),
      averageCaloriesConsumed: average(days.map((day) => day.calories)),
      averageCalorieDifference,
      totalEstimatedActivityCalories,
      averageEstimatedActivityCalories,
      averageIndicativeBalance,
      averageProtein: average(days.map((day) => day.protein)),
      averageCarbs: average(days.map((day) => day.carbs)),
      averageFat: average(days.map((day) => day.fat)),
      daysAboveTarget,
      daysBelowTarget,
      daysFarBelowTarget,
      daysFarAboveTarget,
      totalMeals: meals.length,
      aiEstimatedMealPercent:
        mealsWithNutritionSource.length > 0
          ? Math.round((aiEstimatedMeals.length / mealsWithNutritionSource.length) * 100)
          : null,
      latestWeightKg: bodyWeightSummary.latestWeightKg,
      weightChange7DaysKg: bodyWeightSummary.change7DaysKg,
      weightTrend: bodyWeightSummary.trend,
    },
    days,
    status,
    signals,
    recommendation: buildRecommendation({
      status,
      signals,
      weightTrend: bodyWeightSummary.trend,
      daysFarBelowTarget,
    }),
    cautionMessage,
  };
}
