import "server-only";
import { prisma } from "@/lib/prisma";
import {
  generateExerciseProgressionSuggestion,
  type ProgressionSuggestion,
} from "@/lib/progression-engine";
import { validateOnboardingSafety } from "@/lib/onboarding-safety";
import { getWorkoutPageDataForUser } from "@/lib/workout-execution";
import { buildNormalizedOnboardingProfile } from "@/lib/training-engine/onboarding-profile";
import type { CoachMode } from "@/lib/ai/coach-prompts";

const RECENT_WORKOUT_LIMIT = 4;

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
    } | null;
  }>
) {
  const grouped = new Map<
    string,
    {
      exerciseId: number | null;
      name: string;
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
            orderBy: {
              sortOrder: "asc",
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
      plan: exercise.plan,
      sets: exercise.sets,
      progressionSuggestion: buildProgressionSuggestionFromCurrentLog(exercise),
    })),
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

  const recentCompletedWorkouts = await getRecentCompletedWorkouts(
    userId,
    reviewedWorkoutLog?.id
  );

  return {
    user: {
      id: userId,
    },
    onboarding,
    activeProgram,
    currentWorkout,
    reviewedWorkoutLog,
    recentCompletedWorkouts,
  };
}
