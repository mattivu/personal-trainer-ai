import "server-only";

import type { BodyWeightEntry, NutritionGoal, NutritionProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateBMI, calculateAge, validateOnboardingSafety } from "@/lib/onboarding-safety";
import { estimateDailyActivityCalories } from "@/lib/nutrition/activity-calories";
import { getDateRangeForLocalDay, getMealEntryDateKey, getMergedOnboardingAnswers, getOrCreateNutritionProfile } from "@/lib/nutrition/profile";

const DEFAULT_ANALYSIS_WINDOW_DAYS = 14;
const RECENT_WEIGHT_WINDOW_DAYS = 30;
const MIN_TRACKED_DAYS_FOR_REVIEW = 4;
const MIN_ANALYZABLE_DAYS = 7;
const MIN_COVERAGE_RATIO = 0.55;
const MIN_CALORIE_TARGET = 1400;
const MAX_CALORIE_TARGET = 4500;
const MIN_PROTEIN_TARGET = 90;
const MIN_CARBS_TARGET = 80;
const MIN_FAT_TARGET = 45;
const CALORIE_STEP = 125;

export type AdaptiveNutritionReviewStatus =
  | "insufficient_data"
  | "on_track"
  | "adjustment_recommended"
  | "caution";

export type AdaptiveNutritionRecommendationType =
  | "none"
  | "increase_calories"
  | "decrease_calories"
  | "increase_protein"
  | "reduce_rate"
  | "increase_activity"
  | "hold";

export type AdaptiveNutritionRecommendation = {
  type: AdaptiveNutritionRecommendationType;
  calorieDelta: number;
  proteinDelta: number;
  carbsDelta: number;
  fatDelta: number;
  reason: string;
  caution: string | null;
};

export type AdaptiveNutritionProposedTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type AdaptiveNutritionReview = {
  status: AdaptiveNutritionReviewStatus;
  goal: NutritionGoal;
  analysisWindowDays: number;
  adherence: {
    trackedDays: number;
    mealCoverageRatio: number;
    averageCalories: number | null;
    averageProtein: number | null;
    averageCarbs: number | null;
    averageFat: number | null;
    averageActivityCalories: number | null;
  };
  weightTrend: {
    entries: number;
    latestWeightKg: number | null;
    change7dKg: number | null;
    change14dKg: number | null;
    weeklyRatePercent: number | null;
  };
  recommendation: AdaptiveNutritionRecommendation;
  proposedTargets: AdaptiveNutritionProposedTargets | null;
  warnings: string[];
};

type AdaptiveReviewDay = {
  dateKey: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  activityCalories: number;
  hasMeals: boolean;
};

export type AdaptiveNutritionContext = {
  goal: NutritionGoal;
  profile: Pick<
    NutritionProfile,
    | "id"
    | "goal"
    | "calorieTarget"
    | "proteinTarget"
    | "carbsTarget"
    | "fatTarget"
    | "estimatedTdee"
    | "createdAt"
  >;
  answers: Record<string, unknown>;
  analysisWindowDays: number;
  days: AdaptiveReviewDay[];
  weightEntries: BodyWeightEntry[];
  safety: ReturnType<typeof validateOnboardingSafety>;
  age: number | null;
  bmi: number | null;
  latestWeightKg: number | null;
  preferenceGoal: string | null;
  appetite: string | null;
  challengeNotes: string[];
  aiMealEstimateRatio: number | null;
};

type RecommendationGuardResult = {
  allowed: boolean;
  status: AdaptiveNutritionReviewStatus;
  warnings: string[];
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeComparable(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getDaysDifferenceInclusive(start: Date, end: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1);
}

function getWindowChange(entries: BodyWeightEntry[], days: number) {
  if (entries.length < 2) {
    return null;
  }

  const latestEntry = entries.at(-1);

  if (!latestEntry) {
    return null;
  }

  const cutoffDate = new Date(latestEntry.date);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);

  let baseEntry: BodyWeightEntry | null = null;

  for (const entry of entries) {
    if (entry.date <= cutoffDate) {
      baseEntry = entry;
      continue;
    }

    break;
  }

  if (!baseEntry || baseEntry.id === latestEntry.id) {
    return null;
  }

  return round(latestEntry.weightKg - baseEntry.weightKg, 2);
}

function calculateWeeklyRatePercent(
  latestWeightKg: number | null,
  change7dKg: number | null,
  change14dKg: number | null
) {
  if (latestWeightKg === null || latestWeightKg <= 0) {
    return null;
  }

  if (change14dKg !== null) {
    const baseWeight = latestWeightKg - change14dKg;

    if (baseWeight > 0) {
      return round((change14dKg / baseWeight) * 50, 2);
    }
  }

  if (change7dKg !== null) {
    const baseWeight = latestWeightKg - change7dKg;

    if (baseWeight > 0) {
      return round((change7dKg / baseWeight) * 100, 2);
    }
  }

  return null;
}

function getExtremeCautionSignal(values: string[]) {
  const text = normalizeText(values.join(" "));

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
    /\bfame incontrollata\b/,
    /\bfame forte\b/,
    /\bfatica a controllare la fame\b/,
    /\bvomit/,
    /\blassativ/,
  ].some((pattern) => pattern.test(text));
}

function buildEmptyRecommendation(reason: string, caution: string | null = null) {
  return {
    type: "hold" as const,
    calorieDelta: 0,
    proteinDelta: 0,
    carbsDelta: 0,
    fatDelta: 0,
    reason,
    caution,
  };
}

function createDaySkeleton(dateKey: string): AdaptiveReviewDay {
  return {
    dateKey,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    activityCalories: 0,
    hasMeals: false,
  };
}

function mapWorkoutInput(
  entry: {
    completedAt: Date | null;
    performedAt: Date;
    durationMinutes: number | null;
    perceivedEffort: number | null;
    workout: {
      title: string;
      focus: string | null;
      estimatedMinutes: number | null;
      exercises: { name: string; intensity: string | null }[];
    } | null;
    setLogs: { programExercise: { name: string; intensity: string | null } | null }[];
  }
) {
  const exerciseNames = Array.from(
    new Set(
      [
        ...entry.setLogs.map((setLog) => setLog.programExercise?.name ?? "").filter(Boolean),
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
}

function isPerformanceFocused(preferenceGoal: string | null) {
  const normalized = normalizeText(preferenceGoal);
  return normalized.includes("forza");
}

function isRecompositionFocused(goal: NutritionGoal, preferenceGoal: string | null) {
  if (goal === "recomposition") {
    return true;
  }

  return normalizeText(preferenceGoal).includes("ricomposizione");
}

function buildTargetsFromCalories(input: {
  calories: number;
  protein: number;
  fat: number;
}) {
  const calories = clamp(Math.round(input.calories), MIN_CALORIE_TARGET, MAX_CALORIE_TARGET);
  const protein = Math.max(MIN_PROTEIN_TARGET, Math.round(input.protein));
  let fat = Math.max(MIN_FAT_TARGET, Math.round(input.fat));
  let carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  if (carbs < MIN_CARBS_TARGET) {
    fat = Math.max(
      MIN_FAT_TARGET,
      Math.round((calories - protein * 4 - MIN_CARBS_TARGET * 4) / 9)
    );
    carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  }

  if (carbs < MIN_CARBS_TARGET) {
    carbs = MIN_CARBS_TARGET;
  }

  return {
    calories,
    protein,
    carbs: Math.max(MIN_CARBS_TARGET, carbs),
    fat: Math.max(MIN_FAT_TARGET, fat),
  };
}

export function buildMacroAdjustment(
  currentProfile: Pick<
    NutritionProfile,
    "calorieTarget" | "proteinTarget" | "carbsTarget" | "fatTarget"
  >,
  recommendation: AdaptiveNutritionRecommendation
): AdaptiveNutritionProposedTargets | null {
  if (
    recommendation.type === "none" ||
    recommendation.type === "hold" ||
    recommendation.type === "increase_activity"
  ) {
    return null;
  }

  if (recommendation.type === "increase_protein") {
    const proposedProtein = currentProfile.proteinTarget + recommendation.proteinDelta;
    const calories = currentProfile.calorieTarget;
    const proteinCaloriesDelta = recommendation.proteinDelta * 4;
    let carbs = currentProfile.carbsTarget;
    let fat = currentProfile.fatTarget;

    if (carbs > MIN_CARBS_TARGET) {
      carbs = Math.max(MIN_CARBS_TARGET, carbs - Math.round(proteinCaloriesDelta / 4));
    } else if (fat > MIN_FAT_TARGET) {
      fat = Math.max(MIN_FAT_TARGET, fat - Math.round(proteinCaloriesDelta / 9));
    }

    return {
      calories,
      protein: Math.max(MIN_PROTEIN_TARGET, Math.round(proposedProtein)),
      carbs: Math.max(MIN_CARBS_TARGET, Math.round(carbs)),
      fat,
    };
  }

  const calories = currentProfile.calorieTarget + recommendation.calorieDelta;
  const protein = Math.max(
    MIN_PROTEIN_TARGET,
    currentProfile.proteinTarget + recommendation.proteinDelta
  );
  const fat = Math.max(MIN_FAT_TARGET, currentProfile.fatTarget + recommendation.fatDelta);

  return buildTargetsFromCalories({
    calories,
    protein,
    fat,
  });
}

export function canRecommendNutritionAdjustment(
  context: Pick<
    AdaptiveNutritionContext,
    | "analysisWindowDays"
    | "days"
    | "weightEntries"
    | "safety"
    | "age"
    | "bmi"
    | "profile"
    | "appetite"
    | "challengeNotes"
    | "aiMealEstimateRatio"
  >
): RecommendationGuardResult {
  const trackedDays = context.days.filter((day) => day.hasMeals).length;
  const mealCoverageRatio =
    context.analysisWindowDays > 0 ? trackedDays / context.analysisWindowDays : 0;
  const weightEntriesCount = context.weightEntries.length;
  const warnings: string[] = [];

  if (context.analysisWindowDays < MIN_ANALYZABLE_DAYS) {
    warnings.push("Servono piu dati prima di modificare i target.");
    return {
      allowed: false,
      status: "insufficient_data",
      warnings,
    };
  }

  if (trackedDays < MIN_TRACKED_DAYS_FOR_REVIEW || mealCoverageRatio < MIN_COVERAGE_RATIO) {
    warnings.push("Servono piu dati prima di modificare i target.");
    warnings.push("Registra pasti e peso per qualche giorno: cosi l'aggiustamento sara piu affidabile.");
    return {
      allowed: false,
      status: "insufficient_data",
      warnings,
    };
  }

  if (context.safety.status === "restricted" || context.safety.status === "blocked") {
    warnings.push("Con i dati attuali manteniamo indicazioni prudenti e senza modificare i target.");
    return {
      allowed: false,
      status: "caution",
      warnings,
    };
  }

  if (context.age !== null && context.age < 18) {
    warnings.push("Per la tua fascia d'eta manteniamo solo indicazioni conservative.");
    return {
      allowed: false,
      status: "caution",
      warnings,
    };
  }

  if (context.bmi !== null && context.bmi < 18.5) {
    warnings.push("Con un peso gia basso evitiamo aggiustamenti orientati a ridurre ancora le calorie.");
    return {
      allowed: false,
      status: "caution",
      warnings,
    };
  }

  if (context.profile.calorieTarget <= 1500) {
    warnings.push("Il target attuale e gia prudente: evitiamo altri tagli automatici.");
  }

  const cautionInputs = [
    ...context.challengeNotes,
    context.appetite ?? "",
  ];

  if (getExtremeCautionSignal(cautionInputs)) {
    warnings.push("Sono emersi segnali delicati: non proponiamo modifiche ai target.");
    return {
      allowed: false,
      status: "caution",
      warnings,
    };
  }

  if (context.aiMealEstimateRatio !== null && context.aiMealEstimateRatio >= 0.8) {
    warnings.push("Le stime dei pasti sono ancora troppo incerte per modificare i target.");
    return {
      allowed: false,
      status: "insufficient_data",
      warnings,
    };
  }

  if (weightEntriesCount < 2) {
    warnings.push("Registra il peso piu spesso: con almeno due pesate recenti l'aggiustamento sara piu affidabile.");
  }

  return {
    allowed: true,
    status: "on_track",
    warnings,
  };
}

export function getNutritionAdjustmentRecommendation(
  context: AdaptiveNutritionContext
): AdaptiveNutritionRecommendation {
  const trackedDays = context.days.filter((day) => day.hasMeals).length;
  const trackedDaysData = context.days.filter((day) => day.hasMeals);
  const averageCalories = average(trackedDaysData.map((day) => day.calories));
  const averageProtein = average(trackedDaysData.map((day) => day.protein));
  const averageActivityCalories = average(context.days.map((day) => day.activityCalories));
  const change7dKg = getWindowChange(context.weightEntries, 7);
  const change14dKg = getWindowChange(context.weightEntries, 14);
  const weeklyRatePercent = calculateWeeklyRatePercent(
    context.latestWeightKg,
    change7dKg,
    change14dKg
  );
  const proteinLow =
    averageProtein !== null && averageProtein < context.profile.proteinTarget * 0.9;

  if (trackedDays < MIN_TRACKED_DAYS_FOR_REVIEW || averageCalories === null) {
    return buildEmptyRecommendation("Servono piu dati prima di modificare i target.");
  }

  if (averageCalories < Math.max(1100, context.profile.calorieTarget * 0.65)) {
    return buildEmptyRecommendation(
      "Le calorie medie risultano troppo incerte o molto basse: meglio consolidare il tracciamento prima di cambiare target."
    );
  }

  if (context.weightEntries.length < 2) {
    if (proteinLow) {
      return {
        type: "increase_protein",
        calorieDelta: 0,
        proteinDelta: 15,
        carbsDelta: -15,
        fatDelta: 0,
        reason: "Prima di cambiare le calorie conviene rinforzare un po' le proteine medie.",
        caution: null,
      };
    }

    return buildEmptyRecommendation(
      "Con poche pesate recenti conviene mantenere il target e osservare ancora il trend."
    );
  }

  if (context.goal === "deficit") {
    if (weeklyRatePercent !== null && weeklyRatePercent <= -1) {
      return {
        type: "increase_calories",
        calorieDelta: CALORIE_STEP,
        proteinDelta: 0,
        carbsDelta: 0,
        fatDelta: 0,
        reason: "Il peso sta scendendo velocemente: meglio rallentare con un aumento prudente delle calorie.",
        caution: "Evitiamo altri tagli. Se ti senti scarico o il rapporto con il cibo si irrigidisce, confrontati con un professionista.",
      };
    }

    if (proteinLow) {
      return {
        type: "increase_protein",
        calorieDelta: 0,
        proteinDelta: 15,
        carbsDelta: -15,
        fatDelta: 0,
        reason: "Le proteine medie sono basse rispetto al target: conviene sistemarle prima di ridurre ancora le calorie.",
        caution: null,
      };
    }

    if (change14dKg !== null && change14dKg >= -0.2) {
      if (context.profile.calorieTarget <= 1500) {
        return {
          type: "increase_activity",
          calorieDelta: 0,
          proteinDelta: 0,
          carbsDelta: 0,
          fatDelta: 0,
          reason: "Il peso e stabile ma il target e gia prudente: meglio aumentare leggermente l'attivita invece di tagliare ancora.",
          caution: "Mantieni l'aumento attivita leggero e sostenibile.",
        };
      }

      return {
        type: "decrease_calories",
        calorieDelta: -CALORIE_STEP,
        proteinDelta: 0,
        carbsDelta: 0,
        fatDelta: 0,
        reason: "Con buona continuita e peso stabile da circa due settimane ha senso un piccolo taglio prudente.",
        caution: averageActivityCalories !== null && averageActivityCalories >= 250
          ? "L'attivita e gia presente: evita tagli piu ampi del necessario."
          : "In alternativa puoi aumentare leggermente il cardio o il movimento quotidiano.",
      };
    }

    return {
      type: "hold",
      calorieDelta: 0,
      proteinDelta: 0,
      carbsDelta: 0,
      fatDelta: 0,
      reason: "Il trend sembra coerente: meglio mantenere i target ancora per qualche giorno.",
      caution: null,
    };
  }

  if (context.goal === "surplus") {
    if (weeklyRatePercent !== null && weeklyRatePercent >= 0.5) {
      return {
        type: "decrease_calories",
        calorieDelta: -CALORIE_STEP,
        proteinDelta: 0,
        carbsDelta: 0,
        fatDelta: 0,
        reason: "Il peso sta salendo rapidamente: conviene ridurre leggermente il surplus.",
        caution: "Riduci poco e osserva di nuovo il trend per 10-14 giorni.",
      };
    }

    if (proteinLow) {
      return {
        type: "increase_protein",
        calorieDelta: 0,
        proteinDelta: 15,
        carbsDelta: -15,
        fatDelta: 0,
        reason: "Prima di salire ancora con le calorie conviene consolidare meglio le proteine.",
        caution: null,
      };
    }

    if (change14dKg !== null && change14dKg <= 0.2) {
      return {
        type: "increase_calories",
        calorieDelta: CALORIE_STEP,
        proteinDelta: 0,
        carbsDelta: 0,
        fatDelta: 0,
        reason: "Con buona aderenza e peso stabile da circa due settimane ha senso un aumento piccolo e controllato.",
        caution: averageActivityCalories !== null && averageActivityCalories >= 300
          ? "L'attivita e alta: evita rialzi eccessivi e rivaluta dopo 10-14 giorni."
          : null,
      };
    }

    return {
      type: "hold",
      calorieDelta: 0,
      proteinDelta: 0,
      carbsDelta: 0,
      fatDelta: 0,
      reason: "Il trend e gia in movimento: meglio non cambiare troppo presto.",
      caution: null,
    };
  }

  if (isRecompositionFocused(context.goal, context.preferenceGoal)) {
    if (proteinLow) {
      return {
        type: "increase_protein",
        calorieDelta: 0,
        proteinDelta: 15,
        carbsDelta: -15,
        fatDelta: 0,
        reason: "In ricomposizione conviene dare priorita a proteine piu solide prima di cambiare altro.",
        caution: null,
      };
    }

    if (weeklyRatePercent !== null && weeklyRatePercent <= -0.8) {
      return {
        type: "increase_calories",
        calorieDelta: CALORIE_STEP,
        proteinDelta: 0,
        carbsDelta: 0,
        fatDelta: 0,
        reason: "Il peso sta calando abbastanza in fretta: meglio alleggerire con un piccolo aumento.",
        caution: "In ricomposizione evitiamo cambi frequenti e aggressivi.",
      };
    }

    return {
      type: "hold",
      calorieDelta: 0,
      proteinDelta: 0,
      carbsDelta: 0,
      fatDelta: 0,
      reason: "Con ricomposizione e peso abbastanza stabile conviene mantenere il target.",
      caution: null,
    };
  }

  if (isPerformanceFocused(context.preferenceGoal)) {
    if (weeklyRatePercent !== null && weeklyRatePercent <= -0.5) {
      return {
        type: "increase_calories",
        calorieDelta: CALORIE_STEP,
        proteinDelta: 0,
        carbsDelta: 0,
        fatDelta: 0,
        reason: "Se l'obiettivo e sostenere forza o performance, un calo di peso evidente suggerisce un aumento prudente.",
        caution: null,
      };
    }

    return {
      type: "hold",
      calorieDelta: 0,
      proteinDelta: 0,
      carbsDelta: 0,
      fatDelta: 0,
      reason: "Per supportare forza e performance evitiamo cambi troppo frequenti.",
      caution: null,
    };
  }

  if (weeklyRatePercent !== null && weeklyRatePercent >= 0.4) {
    return {
      type: "decrease_calories",
      calorieDelta: -100,
      proteinDelta: 0,
      carbsDelta: 0,
      fatDelta: 0,
      reason: "Il peso sta salendo in modo chiaro: ha senso un piccolo aggiustamento verso il basso.",
      caution: null,
    };
  }

  if (weeklyRatePercent !== null && weeklyRatePercent <= -0.4) {
    return {
      type: "increase_calories",
      calorieDelta: 100,
      proteinDelta: 0,
      carbsDelta: 0,
      fatDelta: 0,
      reason: "Il peso sta scendendo in modo chiaro: per mantenimento o salute ha senso un piccolo aumento.",
      caution: null,
    };
  }

  return {
    type: "hold",
    calorieDelta: 0,
    proteinDelta: 0,
    carbsDelta: 0,
    fatDelta: 0,
    reason: "Il trend e abbastanza stabile: mantieni il target attuale.",
    caution: null,
  };
}

function buildReviewFromContext(context: AdaptiveNutritionContext): AdaptiveNutritionReview {
  const trackedDaysData = context.days.filter((day) => day.hasMeals);
  const latestWeightKg = context.weightEntries.at(-1)?.weightKg ?? null;
  const change7dKg = getWindowChange(context.weightEntries, 7);
  const change14dKg = getWindowChange(context.weightEntries, 14);
  const weeklyRatePercent = calculateWeeklyRatePercent(
    latestWeightKg,
    change7dKg,
    change14dKg
  );
  const guard = canRecommendNutritionAdjustment(context);
  const recommendation = getNutritionAdjustmentRecommendation({
    ...context,
    latestWeightKg,
  });

  let status: AdaptiveNutritionReviewStatus = guard.status;

  if (guard.allowed) {
    status =
      recommendation.type === "hold" ||
      recommendation.type === "none" ||
      recommendation.type === "increase_activity"
        ? "on_track"
        : "adjustment_recommended";
  }

  if (
    context.goal === "deficit" &&
    weeklyRatePercent !== null &&
    weeklyRatePercent <= -1
  ) {
    status = "caution";
  }

  const warnings = [...guard.warnings];

  if (context.weightEntries.length < 2) {
    warnings.push("Registra il peso per qualche giorno: cosi l'aggiustamento sara piu affidabile.");
  }

  const proposedTargets =
    status === "adjustment_recommended"
      ? buildMacroAdjustment(context.profile, recommendation)
      : null;

  return {
    status,
    goal: context.goal,
    analysisWindowDays: context.analysisWindowDays,
    adherence: {
      trackedDays: trackedDaysData.length,
      mealCoverageRatio:
        context.analysisWindowDays > 0
          ? round(trackedDaysData.length / context.analysisWindowDays, 2)
          : 0,
      averageCalories: average(trackedDaysData.map((day) => day.calories)),
      averageProtein: average(trackedDaysData.map((day) => day.protein)),
      averageCarbs: average(trackedDaysData.map((day) => day.carbs)),
      averageFat: average(trackedDaysData.map((day) => day.fat)),
      averageActivityCalories: average(context.days.map((day) => day.activityCalories)),
    },
    weightTrend: {
      entries: context.weightEntries.length,
      latestWeightKg,
      change7dKg,
      change14dKg,
      weeklyRatePercent,
    },
    recommendation:
      status === "caution" && recommendation.type === "decrease_calories"
        ? {
            ...buildEmptyRecommendation(
              "Con i dati attuali evitiamo di ridurre ancora il target.",
              "Se emergono segnali delicati o una perdita troppo rapida, confrontati con un professionista."
            ),
            type: "hold",
          }
        : recommendation,
    proposedTargets,
    warnings: Array.from(new Set(warnings)),
  };
}

export function buildAdaptiveNutritionReviewForTest(
  context: AdaptiveNutritionContext
) {
  return buildReviewFromContext(context);
}

export async function buildAdaptiveNutritionReview(
  userId: number
): Promise<AdaptiveNutritionReview> {
  const todayRange = getDateRangeForLocalDay();
  const [{ profile }, answers, userProfile] = await Promise.all([
    getOrCreateNutritionProfile(userId),
    getMergedOnboardingAnswers(userId),
    prisma.userProfile.findUnique({
      where: {
        userId,
      },
      select: {
        birthDate: true,
        heightCm: true,
        startingWeight: true,
      },
    }),
  ]);

  const profileAgeDays = getDaysDifferenceInclusive(profile.createdAt, todayRange.end);
  const analysisWindowDays = Math.min(DEFAULT_ANALYSIS_WINDOW_DAYS, profileAgeDays);
  const windowStart = new Date(todayRange.start);
  windowStart.setUTCDate(windowStart.getUTCDate() - (analysisWindowDays - 1));
  const weightCutoff = new Date(todayRange.start);
  weightCutoff.setUTCDate(weightCutoff.getUTCDate() - (RECENT_WEIGHT_WINDOW_DAYS - 1));

  const [meals, weightEntries, workoutLogs] = await Promise.all([
    prisma.mealEntry.findMany({
      where: {
        userId,
        date: {
          gte: windowStart,
          lte: todayRange.end,
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.bodyWeightEntry.findMany({
      where: {
        userId,
        date: {
          gte: weightCutoff,
          lte: todayRange.end,
        },
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
              gte: windowStart,
              lte: todayRange.end,
            },
          },
          {
            completedAt: null,
            performedAt: {
              gte: windowStart,
              lte: todayRange.end,
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

  const dayMap = new Map<string, AdaptiveReviewDay>();

  for (let index = 0; index < analysisWindowDays; index += 1) {
    const date = new Date(windowStart);
    date.setUTCDate(windowStart.getUTCDate() + index);
    const dateKey = getMealEntryDateKey(date);
    dayMap.set(dateKey, createDaySkeleton(dateKey));
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
    day.hasMeals = true;
  }

  const workoutLogsByDate = new Map<string, typeof workoutLogs>();

  for (const workoutLog of workoutLogs) {
    const referenceDate = workoutLog.completedAt ?? workoutLog.performedAt;
    const dateKey = getMealEntryDateKey(referenceDate);
    const currentEntries = workoutLogsByDate.get(dateKey) ?? [];
    currentEntries.push(workoutLog);
    workoutLogsByDate.set(dateKey, currentEntries);
  }

  const fallbackWeightKg = parseWeightKg(answers.pesoKg) ?? userProfile?.startingWeight ?? null;

  for (const [dateKey, entries] of workoutLogsByDate.entries()) {
    const day = dayMap.get(dateKey);

    if (!day) {
      continue;
    }

    const estimate = estimateDailyActivityCalories({
      weightKg: weightEntries.at(-1)?.weightKg ?? fallbackWeightKg,
      workouts: entries.map(mapWorkoutInput),
    });

    day.activityCalories = estimate.totalEstimatedActivityCalories;
  }

  const heightCm = userProfile?.heightCm ?? parseNumber(answers.altezzaCm);
  const latestWeightKg = weightEntries.at(-1)?.weightKg ?? fallbackWeightKg;
  const bmi =
    typeof heightCm === "number" && latestWeightKg !== null
      ? calculateBMI(latestWeightKg, heightCm)
      : null;
  const age = answers.dataNascita
    ? calculateAge(String(answers.dataNascita))
    : userProfile?.birthDate
      ? calculateAge(userProfile.birthDate)
      : null;
  const mealsWithSource = meals.filter(
    (meal) => typeof meal.nutritionSource === "string" && meal.nutritionSource.trim().length > 0
  );
  const aiEstimateMeals = mealsWithSource.filter((meal) => meal.nutritionSource === "ai_estimate");

  return buildReviewFromContext({
    goal: profile.goal,
    profile,
    answers,
    analysisWindowDays,
    days: Array.from(dayMap.values()),
    weightEntries,
    safety: validateOnboardingSafety(answers),
    age,
    bmi,
    latestWeightKg,
    preferenceGoal: typeof answers.obiettivoNutrizionale === "string" ? answers.obiettivoNutrizionale : null,
    appetite: typeof answers.fameAppetito === "string" ? answers.fameAppetito : null,
    challengeNotes: [
      typeof answers.difficoltaNutrizione === "string" ? answers.difficoltaNutrizione : "",
      ...meals.map((meal) => meal.notes ?? ""),
      ...weightEntries.map((entry) => entry.notes ?? ""),
    ].filter(Boolean),
    aiMealEstimateRatio:
      mealsWithSource.length > 0 ? aiEstimateMeals.length / mealsWithSource.length : null,
  });
}
