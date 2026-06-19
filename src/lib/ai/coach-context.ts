import "server-only";
import { prisma } from "@/lib/prisma";
import {
  generateExerciseProgressionSuggestion,
  type ProgressionSuggestion,
} from "@/lib/progression-engine";
import { validateOnboardingSafety } from "@/lib/onboarding-safety";
import { getWorkoutPageDataForUser } from "@/lib/workout-execution";
import { buildNormalizedOnboardingProfile } from "@/lib/training-engine/onboarding-profile";
import { estimateDailyActivityCalories } from "@/lib/nutrition/activity-calories";
import { buildAdaptiveNutritionReview } from "@/lib/nutrition/adaptive-engine";
import { calculateBodyWeightSummary, getBodyWeightTrendLabel } from "@/lib/body-weight";
import { getMealEntryDateKey } from "@/lib/nutrition/profile";
import {
  getFlexibleWorkoutState,
  getWeekEnd,
  getWeekStart,
  getWorkoutScheduleForProgram,
  type FlexibleWorkoutState,
} from "@/lib/workout-schedule";
import type { CoachMode } from "@/lib/ai/coach-prompts";

const RECENT_WORKOUT_LIMIT = 4;
const RECENT_MEAL_WINDOW_DAYS = 14;
const RECENT_WEIGHT_WINDOW_DAYS = 30;
const RECENT_ACTIVITY_WINDOW_DAYS = 14;
const MAX_RECENT_EXERCISES = 8;
const MAX_RECENT_PROGRESSIONS = 6;
const MAX_CONDITIONING_NOTES = 4;
const MAX_CARDIO_MODALITIES = 5;
const MAX_FOCUS_MUSCLES = 6;
const MAX_STRATEGY_NOTES = 4;
const PROGRESSION_PREFIX = "progressione:";

export class CoachContextError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CoachContextError";
    this.status = status;
  }
}

type BuildCoachContextInput = {
  userId: number;
  mode: CoachMode;
  workoutId?: number;
  workoutLogId?: number;
};

type CoachNutritionContext = {
  profile: {
    goal: string;
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    calculationMethod: string;
    updatedAt: string | null;
  } | null;
  recentMealsSummary: {
    daysAnalyzed: number;
    trackedDays: number;
    averageCalories: number | null;
    averageProtein: number | null;
    averageCarbs: number | null;
    averageFat: number | null;
    mealCount: number;
    aiEstimatedMealCount: number;
  };
  adherence: {
    mealCoverageRatio: number | null;
    averageCalorieDeltaFromTarget: number | null;
    proteinTargetCoverage: number | null;
  };
  adaptiveReview: {
    status: string;
    recommendationType: string;
    reason: string;
    proposedTargets: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    } | null;
    warnings: string[];
  } | null;
};

type CoachWeightContext = {
  latestWeightKg: number | null;
  entriesLast7Days: number;
  entriesLast14Days: number;
  change7dKg: number | null;
  change14dKg: number | null;
  trendLabel: string;
};

type CoachActivityContext = {
  recentTrainingDays: number;
  recentCompletedWorkouts: number;
  recentSkippedWorkouts: number;
  averagePerceivedEffort: number | null;
  averageActivityCalories: number | null;
  cardioSessionsDetected: number;
  cardioModalities: string[];
  conditioningNotes: string[];
};

type CoachTrainingContext = {
  programGoal: string | null;
  splitSummary: string | null;
  nextWorkout: {
    id: number;
    title: string;
    dayLabel: string | null;
    plannedDateLabel: string;
    state: FlexibleWorkoutState;
    focus: string | null;
  } | null;
  recentExercises: Array<{
    workoutTitle: string;
    performedAt: string | null;
    exerciseNames: string[];
  }>;
  recentProgressions: Array<{
    exerciseName: string;
    source: "workout_suggestion" | "program_note" | "reviewed_workout";
    summary: string;
  }>;
  progressionNotes: string[];
  focusMuscles: string[];
  strategyNotes: string[];
};

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function compactText(value: string | null | undefined, maxLength = 280) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function fallbackDurationWeeks(goal: string | null) {
  const normalizedGoal = (goal ?? "").toLowerCase();

  if (
    normalizedGoal.includes("perdita") ||
    normalizedGoal.includes("wellness") ||
    normalizedGoal.includes("benessere")
  ) {
    return 4;
  }

  return 6;
}

function normalizeComparable(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function uniqueCompact(values: Array<string | null | undefined>, maxItems: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const normalized = value.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

function getProgressionLine(notes: string | null | undefined) {
  if (!notes) {
    return null;
  }

  const line = notes
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => normalizeComparable(entry).startsWith(PROGRESSION_PREFIX));

  return compactText(line, 140);
}

function getCardioModality(text: string) {
  const normalized = normalizeComparable(text);

  if (!normalized) {
    return null;
  }

  if (normalized.includes("treadmill") || normalized.includes("cammin")) {
    return "Camminata/treadmill";
  }

  if (normalized.includes("bike") || normalized.includes("cyclette")) {
    return "Bike/cyclette";
  }

  if (normalized.includes("row") || normalized.includes("vogator")) {
    return "Vogatore";
  }

  if (normalized.includes("stair")) {
    return "Stair climber";
  }

  if (normalized.includes("ellitt")) {
    return "Ellittica";
  }

  if (normalized.includes("run") || normalized.includes("corsa")) {
    return "Corsa";
  }

  if (normalized.includes("conditioning") || normalized.includes("metcon")) {
    return "Conditioning";
  }

  if (normalized.includes("hiit") || normalized.includes("interval")) {
    return "Intervalli/HIIT";
  }

  if (normalized.includes("cardio")) {
    return "Cardio generico";
  }

  return null;
}

function includesCardioSignal(input: {
  names: string[];
  categories: string[];
  notes: string[];
  focus?: string | null;
  title?: string | null;
}) {
  const combined = normalizeComparable(
    [
      input.title ?? "",
      input.focus ?? "",
      ...input.names,
      ...input.categories,
      ...input.notes,
    ].join(" ")
  );

  return (
    input.categories.some((category) => normalizeComparable(category) === "cardio") ||
    [
      "conditioning",
      "cardio",
      "hiit",
      "metcon",
      "bike",
      "cyclette",
      "row",
      "vogator",
      "cammin",
      "treadmill",
      "ellitt",
      "stair",
      "corsa",
      "interval",
    ].some((term) => combined.includes(term))
  );
}

function buildExerciseGroupFromSetLogs(
  setLogs: Array<{
    id: number;
    setNumber: number;
    weightKg: number | null;
    actualReps: number | null;
    rir: number | null;
    completed: boolean;
    notes: string | null;
    programExerciseId: number | null;
    programExercise: {
      id: number;
      name: string;
      reps: string | null;
      sets: number | null;
      intensity: string | null;
      restSeconds: number | null;
      exercise: {
        category: string | null;
        primaryMuscle: string | null;
      } | null;
    } | null;
  }>
) {
  const grouped = new Map<
    string,
    {
      exerciseId: number | null;
      name: string;
      category: string | null;
      primaryMuscle: string | null;
      plan: {
        sets: number | null;
        reps: string | null;
        intensity: string | null;
        restSeconds: number | null;
      } | null;
      sets: Array<{
        setNumber: number;
        weightKg: number | null;
        actualReps: number | null;
        rir: number | null;
        completed: boolean;
        notes: string | null;
      }>;
    }
  >();

  for (const setLog of setLogs) {
    const exerciseKey = setLog.programExerciseId
      ? `program-exercise-${setLog.programExerciseId}`
      : `set-log-${setLog.id}`;
    const existing = grouped.get(exerciseKey);

    if (existing) {
      existing.sets.push({
        setNumber: setLog.setNumber,
        weightKg: setLog.weightKg,
        actualReps: setLog.actualReps,
        rir: setLog.rir,
        completed: setLog.completed,
        notes: compactText(setLog.notes, 120),
      });
      continue;
    }

    grouped.set(exerciseKey, {
      exerciseId: setLog.programExerciseId,
      name: setLog.programExercise?.name ?? `Esercizio ${setLog.id}`,
      category: setLog.programExercise?.exercise?.category ?? null,
      primaryMuscle: setLog.programExercise?.exercise?.primaryMuscle ?? null,
      plan: setLog.programExercise
        ? {
            sets: setLog.programExercise.sets,
            reps: setLog.programExercise.reps,
            intensity: setLog.programExercise.intensity,
            restSeconds: setLog.programExercise.restSeconds,
          }
        : null,
      sets: [
        {
          setNumber: setLog.setNumber,
          weightKg: setLog.weightKg,
          actualReps: setLog.actualReps,
          rir: setLog.rir,
          completed: setLog.completed,
          notes: compactText(setLog.notes, 120),
        },
      ],
    });
  }

  return Array.from(grouped.values());
}

function buildProgressionSuggestionFromCurrentLog(exercise: {
  plan: {
    sets: number | null;
    reps: string | null;
    intensity: string | null;
    restSeconds: number | null;
  } | null;
  sets: Array<{
    setNumber: number;
    weightKg: number | null;
    actualReps: number | null;
    rir: number | null;
    completed: boolean;
  }>;
}): ProgressionSuggestion | null {
  if (!exercise.plan) {
    return null;
  }

  return generateExerciseProgressionSuggestion({
    plannedExercise: exercise.plan,
    previousSets: exercise.sets.map((setLog) => ({
      setNumber: setLog.setNumber,
      weightKg: setLog.weightKg,
      actualReps: setLog.actualReps,
      rir: setLog.rir,
      completed: setLog.completed,
    })),
  });
}

async function getNormalizedOnboarding(userId: number) {
  const onboardingAnswers = await prisma.onboardingAnswer.findMany({
    where: {
      userId,
    },
    select: {
      answersJson: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const { mergedAnswers, profile } = buildNormalizedOnboardingProfile(
    onboardingAnswers.map((entry) => entry.answersJson)
  );
  const safety = validateOnboardingSafety(mergedAnswers);

  return {
    profile,
    safety: {
      status: safety.status,
      messages: safety.messages.slice(0, 3),
    },
  };
}

async function getActiveProgramSummary(userId: number) {
  const activeProgram = await prisma.trainingProgram.findFirst({
    where: {
      userId,
      status: "active",
    },
    include: {
      workouts: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          exercises: {
            where: {
              isActive: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              exercise: {
                select: {
                  category: true,
                  primaryMuscle: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!activeProgram) {
    throw new CoachContextError(
      404,
      "Nessun programma attivo disponibile per il Coach AI."
    );
  }

  return {
    id: activeProgram.id,
    title: activeProgram.title,
    goal: activeProgram.goal,
    source: activeProgram.source,
    durationWeeks:
      activeProgram.durationWeeks ?? fallbackDurationWeeks(activeProgram.goal),
    startedAt: toIsoString(
      activeProgram.startedAt ?? activeProgram.startDate ?? activeProgram.createdAt
    ),
    plannedReviewAt: toIsoString(activeProgram.plannedReviewAt),
    notes: compactText(activeProgram.notes),
    workouts: activeProgram.workouts.map((workout) => ({
      id: workout.id,
      title: workout.title,
      dayLabel: workout.dayLabel,
      focus: workout.focus,
      estimatedMinutes: workout.estimatedMinutes,
      notes: compactText(workout.notes, 180),
      exercises: workout.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        intensity: exercise.intensity,
        notes: compactText(exercise.notes, 120),
        category: exercise.exercise?.category ?? null,
        primaryMuscle: exercise.exercise?.primaryMuscle ?? null,
      })),
    })),
  };
}

async function getRecentCompletedWorkouts(userId: number, excludeWorkoutLogId?: number) {
  const workoutLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      status: "completed",
      ...(excludeWorkoutLogId
        ? {
            id: {
              not: excludeWorkoutLogId,
            },
          }
        : {}),
    },
    orderBy: [{ completedAt: "desc" }, { performedAt: "desc" }, { id: "desc" }],
    take: RECENT_WORKOUT_LIMIT,
    include: {
      workout: {
        select: {
          title: true,
        },
      },
      setLogs: {
        include: {
          programExercise: {
            select: {
              id: true,
              name: true,
              reps: true,
              sets: true,
              intensity: true,
              restSeconds: true,
              exercise: {
                select: {
                  category: true,
                  primaryMuscle: true,
                },
              },
            },
          },
        },
        orderBy: [{ setNumber: "asc" }, { id: "asc" }],
      },
    },
  });

  return workoutLogs.map((log) => ({
    id: log.id,
    workoutTitle: log.workout?.title ?? "Seduta",
    performedAt: toIsoString(log.performedAt),
    completedAt: toIsoString(log.completedAt),
    perceivedEffort: log.perceivedEffort,
    notes: compactText(log.notes, 160),
    exercises: buildExerciseGroupFromSetLogs(log.setLogs).map((exercise) => ({
      name: exercise.name,
      category: exercise.category,
      primaryMuscle: exercise.primaryMuscle,
      sets: exercise.sets.slice(0, 4),
    })),
  }));
}

async function getWorkoutGuidanceContext(userId: number, workoutId: number) {
  const workoutData = await getWorkoutPageDataForUser(userId, workoutId);

  if (!workoutData) {
    throw new CoachContextError(
      403,
      "La seduta richiesta non appartiene al programma attivo dell'utente."
    );
  }

  return {
    id: workoutData.workout.id,
    title: workoutData.workout.title,
    dayLabel: workoutData.workout.dayLabel,
    focus: workoutData.workout.focus,
    notes: compactText(workoutData.workout.notes, 220),
    state: workoutData.workoutState,
    plannedDateLabel: workoutData.plannedDateLabel,
    existingLog: workoutData.existingLog
      ? {
          id: workoutData.existingLog.id,
          status: workoutData.existingLog.status,
          performedAt: workoutData.existingLog.performedAt,
          startedAt: workoutData.existingLog.startedAt,
          completedAt: workoutData.existingLog.completedAt,
          perceivedEffort: workoutData.existingLog.perceivedEffort,
          notes: compactText(workoutData.existingLog.notes, 180),
        }
      : null,
    exercises: workoutData.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
      intensity: exercise.intensity,
      notes: compactText(exercise.notes, 120),
      previousPerformance: exercise.previousPerformance
        ? {
            performedAt: exercise.previousPerformance.performedAt,
            status: exercise.previousPerformance.status,
            sets: exercise.previousPerformance.sets.slice(0, 5).map((setLog) => ({
              setNumber: setLog.setNumber,
              actualWeight: setLog.actualWeight,
              actualReps: setLog.actualReps,
              actualRir: setLog.actualRir,
              completed: setLog.completed,
            })),
          }
        : null,
      todaySummary: exercise.todaySummary.slice(0, 5),
      progressionSuggestion: exercise.progressionSuggestion,
    })),
  };
}

async function getWorkoutLogReviewContext(userId: number, workoutLogId: number) {
  const workoutLog = await prisma.workoutLog.findFirst({
    where: {
      id: workoutLogId,
      userId,
    },
    include: {
      workout: {
        select: {
          id: true,
          title: true,
          focus: true,
        },
      },
      program: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      setLogs: {
        include: {
          programExercise: {
            select: {
              id: true,
              name: true,
              reps: true,
              sets: true,
              intensity: true,
              restSeconds: true,
              exercise: {
                select: {
                  category: true,
                  primaryMuscle: true,
                },
              },
            },
          },
        },
        orderBy: [{ setNumber: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!workoutLog) {
    throw new CoachContextError(404, "Seduta non trovata.");
  }

  const exercises = buildExerciseGroupFromSetLogs(workoutLog.setLogs);

  return {
    id: workoutLog.id,
    status: workoutLog.status,
    performedAt: toIsoString(workoutLog.performedAt),
    startedAt: toIsoString(workoutLog.startedAt),
    completedAt: toIsoString(workoutLog.completedAt),
    perceivedEffort: workoutLog.perceivedEffort,
    notes: compactText(workoutLog.notes, 220),
    workout: workoutLog.workout
      ? {
          id: workoutLog.workout.id,
          title: workoutLog.workout.title,
          focus: workoutLog.workout.focus,
        }
      : null,
    program: workoutLog.program
      ? {
          id: workoutLog.program.id,
          title: workoutLog.program.title,
          status: workoutLog.program.status,
        }
      : null,
    exercises: exercises.map((exercise) => ({
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      category: exercise.category,
      plan: exercise.plan,
      sets: exercise.sets,
      progressionSuggestion: buildProgressionSuggestionFromCurrentLog(exercise),
    })),
  };
}

async function getReadOnlyNutritionContext(userId: number): Promise<{
  nutritionContext: CoachNutritionContext;
  weightContext: CoachWeightContext;
  latestWeightKgForActivity: number | null;
}> {
  const nutritionProfile = await prisma.nutritionProfile.findUnique({
    where: {
      userId,
    },
  });

  const now = new Date();
  const mealCutoff = new Date(now);
  mealCutoff.setUTCDate(mealCutoff.getUTCDate() - (RECENT_MEAL_WINDOW_DAYS - 1));
  const weightCutoff = new Date(now);
  weightCutoff.setUTCDate(weightCutoff.getUTCDate() - (RECENT_WEIGHT_WINDOW_DAYS - 1));

  const [meals, weightEntries, adaptiveReview] = await Promise.all([
    prisma.mealEntry.findMany({
      where: {
        userId,
        date: {
          gte: mealCutoff,
          lte: now,
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        date: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        nutritionSource: true,
      },
    }),
    prisma.bodyWeightEntry.findMany({
      where: {
        userId,
        date: {
          gte: weightCutoff,
          lte: now,
        },
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      select: {
        id: true,
        date: true,
        weightKg: true,
      },
    }),
    nutritionProfile ? buildAdaptiveNutritionReview(userId) : Promise.resolve(null),
  ]);

  const mealsByDay = new Map<
    string,
    {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      mealCount: number;
    }
  >();

  for (const meal of meals) {
    const dateKey = getMealEntryDateKey(meal.date);
    const day =
      mealsByDay.get(dateKey) ?? {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealCount: 0,
      };

    day.calories += meal.calories;
    day.protein += meal.protein;
    day.carbs += meal.carbs;
    day.fat += meal.fat;
    day.mealCount += 1;
    mealsByDay.set(dateKey, day);
  }

  const trackedDays = mealsByDay.size;
  const recentMealDays = Array.from(mealsByDay.values());
  const latestWeightEntry = weightEntries.at(-1) ?? null;
  const bodyWeightSummary = calculateBodyWeightSummary(
    weightEntries.map((entry) => ({
      id: entry.id,
      userId,
      date: entry.date,
      weightKg: entry.weightKg,
      notes: null,
      createdAt: entry.date,
      updatedAt: entry.date,
    }))
  );
  const entriesLast7Days = weightEntries.filter((entry) => {
    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - 7);
    return entry.date >= cutoff;
  }).length;
  const entriesLast14Days = weightEntries.filter((entry) => {
    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - 14);
    return entry.date >= cutoff;
  }).length;

  return {
    nutritionContext: {
      profile: nutritionProfile
        ? {
            goal: nutritionProfile.goal,
            calorieTarget: nutritionProfile.calorieTarget,
            proteinTarget: nutritionProfile.proteinTarget,
            carbsTarget: nutritionProfile.carbsTarget,
            fatTarget: nutritionProfile.fatTarget,
            calculationMethod: nutritionProfile.calculationMethod,
            updatedAt: toIsoString(nutritionProfile.updatedAt),
          }
        : null,
      recentMealsSummary: {
        daysAnalyzed: RECENT_MEAL_WINDOW_DAYS,
        trackedDays,
        averageCalories: average(recentMealDays.map((day) => day.calories)),
        averageProtein: average(recentMealDays.map((day) => day.protein)),
        averageCarbs: average(recentMealDays.map((day) => day.carbs)),
        averageFat: average(recentMealDays.map((day) => day.fat)),
        mealCount: meals.length,
        aiEstimatedMealCount: meals.filter(
          (meal) => meal.nutritionSource === "ai_estimate"
        ).length,
      },
      adherence: {
        mealCoverageRatio:
          RECENT_MEAL_WINDOW_DAYS > 0 ? round(trackedDays / RECENT_MEAL_WINDOW_DAYS, 2) : null,
        averageCalorieDeltaFromTarget:
          nutritionProfile && recentMealDays.length > 0
            ? average(
                recentMealDays.map((day) => day.calories - nutritionProfile.calorieTarget)
              )
            : null,
        proteinTargetCoverage:
          nutritionProfile && nutritionProfile.proteinTarget > 0 && recentMealDays.length > 0
            ? round(
                recentMealDays.reduce((sum, day) => sum + day.protein, 0) /
                  (recentMealDays.length * nutritionProfile.proteinTarget),
                2
              )
            : null,
      },
      adaptiveReview: adaptiveReview
        ? {
            status: adaptiveReview.status,
            recommendationType: adaptiveReview.recommendation.type,
            reason: compactText(adaptiveReview.recommendation.reason, 180) ?? "",
            proposedTargets: adaptiveReview.proposedTargets,
            warnings: adaptiveReview.warnings
              .map((warning) => compactText(warning, 140))
              .filter((warning): warning is string => Boolean(warning))
              .slice(0, 4),
          }
        : null,
    },
    weightContext: {
      latestWeightKg: latestWeightEntry?.weightKg ?? null,
      entriesLast7Days,
      entriesLast14Days,
      change7dKg:
        bodyWeightSummary.change7DaysKg !== null
          ? round(bodyWeightSummary.change7DaysKg, 2)
          : null,
      change14dKg:
        adaptiveReview?.weightTrend.change14dKg !== null &&
        adaptiveReview?.weightTrend.change14dKg !== undefined
          ? round(adaptiveReview.weightTrend.change14dKg, 2)
          : null,
      trendLabel: getBodyWeightTrendLabel(bodyWeightSummary.trend),
    },
    latestWeightKgForActivity: latestWeightEntry?.weightKg ?? null,
  };
}

async function getActivityContext(
  userId: number,
  activeProgram: Awaited<ReturnType<typeof getActiveProgramSummary>>,
  fallbackWeightKg: number | null
): Promise<CoachActivityContext> {
  const now = new Date();
  const activityCutoff = new Date(now);
  activityCutoff.setUTCDate(activityCutoff.getUTCDate() - (RECENT_ACTIVITY_WINDOW_DAYS - 1));
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);

  const recentLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      programId: activeProgram.id,
      performedAt: {
        gte: activityCutoff,
        lte: now,
      },
    },
    orderBy: [{ performedAt: "desc" }, { id: "desc" }],
    include: {
      workout: {
        select: {
          title: true,
          focus: true,
          estimatedMinutes: true,
          notes: true,
          exercises: {
            where: {
              isActive: true,
            },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: {
              name: true,
              intensity: true,
              notes: true,
              exercise: {
                select: {
                  category: true,
                },
              },
            },
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
              notes: true,
              exercise: {
                select: {
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const completedLogs = recentLogs.filter((log) => log.status === "completed");
  const skippedLogs = recentLogs.filter((log) => log.status === "skipped");
  const recentTrainingDays = new Set(
    completedLogs.map((log) => getMealEntryDateKey(log.completedAt ?? log.performedAt))
  ).size;
  const activityCalories = completedLogs
    .map((entry) =>
      estimateDailyActivityCalories({
        weightKg: fallbackWeightKg,
        workouts: [
          {
            workoutName: entry.workout?.title ?? "Seduta completata",
            workoutFocus: entry.workout?.focus ?? null,
            estimatedMinutes: entry.workout?.estimatedMinutes ?? null,
            durationMinutes: entry.durationMinutes,
            perceivedEffort: entry.perceivedEffort,
            exerciseNames: uniqueCompact(
              [
                ...(entry.workout?.exercises.map((exercise) => exercise.name) ?? []),
                ...entry.setLogs.map(
                  (setLog) => setLog.programExercise?.name ?? null
                ),
              ],
              12
            ),
            exerciseIntensityHints: uniqueCompact(
              [
                ...(entry.workout?.exercises.map((exercise) => exercise.intensity) ?? []),
                ...entry.setLogs.map(
                  (setLog) => setLog.programExercise?.intensity ?? null
                ),
              ],
              12
            ),
          },
        ],
      }).totalEstimatedActivityCalories
    )
    .filter((value) => Number.isFinite(value));

  const cardioModalities = uniqueCompact(
    completedLogs.flatMap((entry) => {
      const values = [
        getCardioModality(entry.workout?.title ?? ""),
        getCardioModality(entry.workout?.focus ?? ""),
        getCardioModality(entry.workout?.notes ?? ""),
        ...(entry.workout?.exercises.map((exercise) =>
          getCardioModality([exercise.name, exercise.notes ?? ""].join(" "))
        ) ?? []),
        ...entry.setLogs.map((setLog) =>
          getCardioModality(
            [
              setLog.programExercise?.name ?? "",
              setLog.programExercise?.notes ?? "",
            ].join(" ")
          )
        ),
      ];

      return values;
    }),
    MAX_CARDIO_MODALITIES
  );
  const cardioSessionsDetected = completedLogs.filter((entry) =>
    includesCardioSignal({
      title: entry.workout?.title ?? null,
      focus: entry.workout?.focus ?? null,
      notes: [
        entry.notes ?? "",
        entry.workout?.notes ?? "",
        ...(entry.workout?.exercises.map((exercise) => exercise.notes ?? "") ?? []),
        ...entry.setLogs.map((setLog) => setLog.programExercise?.notes ?? ""),
      ],
      names: [
        ...(entry.workout?.exercises.map((exercise) => exercise.name) ?? []),
        ...entry.setLogs.map((setLog) => setLog.programExercise?.name ?? ""),
      ],
      categories: [
        ...(entry.workout?.exercises.map(
          (exercise) => exercise.exercise?.category ?? ""
        ) ?? []),
        ...entry.setLogs.map(
          (setLog) => setLog.programExercise?.exercise?.category ?? ""
        ),
      ],
    })
  ).length;

  const weekLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      programId: activeProgram.id,
      performedAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: {
      id: true,
      workoutId: true,
      status: true,
      performedAt: true,
      startedAt: true,
      completedAt: true,
      updatedAt: true,
    },
    orderBy: [{ performedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
  });

  const latestLogByWorkoutId = new Map<number, (typeof weekLogs)[number]>();

  for (const log of weekLogs) {
    if (!log.workoutId || latestLogByWorkoutId.has(log.workoutId)) {
      continue;
    }

    latestLogByWorkoutId.set(log.workoutId, log);
  }

  const scheduledStates = getWorkoutScheduleForProgram(activeProgram.workouts, now).map(
    ({ workout, plannedDateLabel, plannedDateThisWeek }) =>
      getFlexibleWorkoutState({
        plannedDateThisWeek,
        plannedDateLabel,
        weekLog: latestLogByWorkoutId.get(workout.id) ?? null,
        referenceDate: now,
      }).state
  );
  const plannedCardioSessions = activeProgram.workouts.filter((workout) =>
    includesCardioSignal({
      title: workout.title,
      focus: workout.focus,
      notes: [
        workout.notes ?? "",
        ...workout.exercises.map((exercise) => exercise.notes ?? ""),
      ],
      names: workout.exercises.map((exercise) => exercise.name),
      categories: workout.exercises.map((exercise) => exercise.category ?? ""),
    })
  ).length;

  const conditioningNotes = uniqueCompact(
    [
      plannedCardioSessions > 0
        ? `Cardio/conditioning previsto nel programma: ${plannedCardioSessions} sedute.`
        : null,
      cardioSessionsDetected === 0 && plannedCardioSessions > 0
        ? "Negli ultimi giorni non risultano sedute cardio/conditioning completate."
        : null,
      cardioSessionsDetected > 0
        ? `Sedute cardio/conditioning recenti rilevate: ${cardioSessionsDetected}.`
        : null,
      scheduledStates.includes("overdue") || scheduledStates.includes("skipped")
        ? "C'e almeno una seduta prevista da recuperare o segnata come saltata."
        : null,
      cardioModalities.length > 0
        ? `Modalita recenti: ${cardioModalities.join(", ")}.`
        : null,
    ],
    MAX_CONDITIONING_NOTES
  );

  return {
    recentTrainingDays,
    recentCompletedWorkouts: completedLogs.length,
    recentSkippedWorkouts: skippedLogs.length,
    averagePerceivedEffort: average(
      completedLogs
        .map((log) => log.perceivedEffort)
        .filter((value): value is number => value !== null)
    ),
    averageActivityCalories: average(activityCalories),
    cardioSessionsDetected,
    cardioModalities,
    conditioningNotes,
  };
}

function buildTrainingContext(input: {
  activeProgram: Awaited<ReturnType<typeof getActiveProgramSummary>>;
  recentCompletedWorkouts: Awaited<ReturnType<typeof getRecentCompletedWorkouts>>;
  currentWorkout: Awaited<ReturnType<typeof getWorkoutGuidanceContext>> | null;
  reviewedWorkoutLog: Awaited<ReturnType<typeof getWorkoutLogReviewContext>> | null;
}): CoachTrainingContext {
  const now = new Date();
  const scheduledWorkouts = getWorkoutScheduleForProgram(input.activeProgram.workouts, now).map(
    ({ workout, plannedDateLabel, plannedDateThisWeek }) => ({
      workout,
      plannedDateLabel,
      state: getFlexibleWorkoutState({
        plannedDateThisWeek,
        plannedDateLabel,
        referenceDate: now,
      }).state,
    })
  );
  const nextWorkout =
    scheduledWorkouts.find((entry) =>
      ["recommended_today", "overdue", "future_available"].includes(entry.state)
    ) ?? null;

  const recentExercises = input.recentCompletedWorkouts
    .map((workout) => ({
      workoutTitle: workout.workoutTitle,
      performedAt: workout.completedAt ?? workout.performedAt,
      exerciseNames: uniqueCompact(
        workout.exercises.map((exercise) => exercise.name),
        4
      ),
    }))
    .filter((entry) => entry.exerciseNames.length > 0)
    .slice(0, MAX_RECENT_EXERCISES);

  const recentProgressions: CoachTrainingContext["recentProgressions"] = [];

  for (const exercise of input.currentWorkout?.exercises ?? []) {
    if (!exercise.progressionSuggestion) {
      continue;
    }

    recentProgressions.push({
      exerciseName: exercise.name,
      source: "workout_suggestion",
      summary: compactText(exercise.progressionSuggestion.suggestedAction, 120) ?? "",
    });
  }

  for (const exercise of input.reviewedWorkoutLog?.exercises ?? []) {
    if (!exercise.progressionSuggestion) {
      continue;
    }

    recentProgressions.push({
      exerciseName: exercise.name,
      source: "reviewed_workout",
      summary: compactText(exercise.progressionSuggestion.suggestedAction, 120) ?? "",
    });
  }

  for (const workout of input.activeProgram.workouts) {
    for (const exercise of workout.exercises) {
      const progressionLine = getProgressionLine(exercise.notes);

      if (!progressionLine) {
        continue;
      }

      recentProgressions.push({
        exerciseName: exercise.name,
        source: "program_note",
        summary: progressionLine,
      });
    }
  }

  const progressionNotes = uniqueCompact(
    input.activeProgram.workouts.flatMap((workout) =>
      workout.exercises.map((exercise) => getProgressionLine(exercise.notes))
    ),
    MAX_RECENT_PROGRESSIONS
  );

  const focusMuscles = uniqueCompact(
    [
      ...input.activeProgram.workouts.flatMap((workout) =>
        workout.exercises.map((exercise) => exercise.primaryMuscle)
      ),
      ...input.currentWorkout?.exercises.map((exercise) => exercise.primaryMuscle) ?? [],
      ...input.reviewedWorkoutLog?.exercises.map((exercise) => exercise.primaryMuscle) ?? [],
    ],
    MAX_FOCUS_MUSCLES
  );

  const strategyNotes = uniqueCompact(
    [
      input.activeProgram.goal
        ? `Obiettivo programma: ${input.activeProgram.goal}.`
        : null,
      input.activeProgram.notes,
      ...input.activeProgram.workouts.map((workout) => workout.focus),
      ...input.activeProgram.workouts.map((workout) => workout.notes),
    ],
    MAX_STRATEGY_NOTES
  );

  return {
    programGoal: input.activeProgram.goal,
    splitSummary:
      input.activeProgram.workouts.length > 0
        ? `${input.activeProgram.workouts.length} sedute/settimana`
        : null,
    nextWorkout: nextWorkout
      ? {
          id: nextWorkout.workout.id,
          title: nextWorkout.workout.title,
          dayLabel: nextWorkout.workout.dayLabel,
          plannedDateLabel: nextWorkout.plannedDateLabel,
          state: nextWorkout.state,
          focus: nextWorkout.workout.focus,
        }
      : null,
    recentExercises,
    recentProgressions: recentProgressions.slice(0, MAX_RECENT_PROGRESSIONS),
    progressionNotes,
    focusMuscles,
    strategyNotes,
  };
}

export type CoachContext = {
  user: {
    id: number;
  };
  onboarding: Awaited<ReturnType<typeof getNormalizedOnboarding>>;
  activeProgram: Awaited<ReturnType<typeof getActiveProgramSummary>>;
  currentWorkout: Awaited<ReturnType<typeof getWorkoutGuidanceContext>> | null;
  reviewedWorkoutLog: Awaited<ReturnType<typeof getWorkoutLogReviewContext>> | null;
  recentCompletedWorkouts: Awaited<ReturnType<typeof getRecentCompletedWorkouts>>;
  nutritionContext: CoachNutritionContext;
  weightContext: CoachWeightContext;
  activityContext: CoachActivityContext;
  trainingContext: CoachTrainingContext;
};

export async function buildCoachContext({
  userId,
  mode,
  workoutId,
  workoutLogId,
}: BuildCoachContextInput): Promise<CoachContext> {
  const [onboarding, activeProgram] = await Promise.all([
    getNormalizedOnboarding(userId),
    getActiveProgramSummary(userId),
  ]);

  if (workoutId !== undefined) {
    const belongsToActiveProgram = activeProgram.workouts.some(
      (workout) => workout.id === workoutId
    );

    if (!belongsToActiveProgram) {
      throw new CoachContextError(
        403,
        "La seduta richiesta non appartiene al programma attivo dell'utente."
      );
    }
  }

  let currentWorkout: CoachContext["currentWorkout"] = null;
  let reviewedWorkoutLog: CoachContext["reviewedWorkoutLog"] = null;

  if (mode === "workout_guidance" || mode === "chat") {
    if (workoutId === undefined) {
      if (mode === "workout_guidance") {
        throw new CoachContextError(
          400,
          "workoutId obbligatorio per workout_guidance."
        );
      }
    }

    if (workoutId !== undefined) {
      currentWorkout = await getWorkoutGuidanceContext(userId, workoutId);
    }
  }

  if (mode === "post_workout_review") {
    if (workoutLogId === undefined) {
      throw new CoachContextError(
        400,
        "workoutLogId obbligatorio per post_workout_review."
      );
    }

    reviewedWorkoutLog = await getWorkoutLogReviewContext(userId, workoutLogId);
  }

  const [recentCompletedWorkouts, nutritionAndWeight] = await Promise.all([
    getRecentCompletedWorkouts(userId, reviewedWorkoutLog?.id),
    getReadOnlyNutritionContext(userId),
  ]);
  const activityContext = await getActivityContext(
    userId,
    activeProgram,
    nutritionAndWeight.latestWeightKgForActivity
  );
  const trainingContext = buildTrainingContext({
    activeProgram,
    recentCompletedWorkouts,
    currentWorkout,
    reviewedWorkoutLog,
  });

  return {
    user: {
      id: userId,
    },
    onboarding,
    activeProgram,
    currentWorkout,
    reviewedWorkoutLog,
    recentCompletedWorkouts,
    nutritionContext: nutritionAndWeight.nutritionContext,
    weightContext: nutritionAndWeight.weightContext,
    activityContext,
    trainingContext,
  };
}
