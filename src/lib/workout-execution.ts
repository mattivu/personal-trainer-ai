import { prisma } from "@/lib/prisma";
import {
  generateExerciseProgressionSuggestion,
  type ProgressionSuggestion,
} from "@/lib/progression-engine";
import {
  getFlexibleWorkoutState,
  getWeekEnd,
  getWeekStart,
  getWorkoutScheduleForProgram,
  type FlexibleWorkoutState,
} from "@/lib/workout-schedule";

export type WorkoutFormSetLog = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  actualRir: number | null;
  actualRpe: number | null;
  completed: boolean;
  notes: string;
};

export type WorkoutTodaySummarySet = {
  setNumber: number;
  weightKg: number | null;
  actualReps: number | null;
  rir: number | null;
  completed: boolean;
};

export type WorkoutFormExercise = {
  id: number;
  exerciseId: number | null;
  name: string;
  category: string | null;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
  needsTranslation: boolean;
  imageUrls: string[];
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  intensity: string | null;
  notes: string | null;
  initialSetLogs: WorkoutFormSetLog[];
  previousPerformance: {
    performedAt: string;
    status: string;
    sets: WorkoutFormSetLog[];
  } | null;
  todaySummary: WorkoutTodaySummarySet[];
  progressionSuggestion: ProgressionSuggestion;
};

export type WorkoutFormLog = {
  id: number;
  status: string;
  perceivedEffort: number | null;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  performedAt: string;
};

export type WorkoutPageData = {
  programId: number;
  workoutState: FlexibleWorkoutState;
  plannedDateLabel: string;
  plannedDateThisWeek: string;
  isPlannedToday: boolean;
  isPastPlannedDate: boolean;
  isFuturePlannedDate: boolean;
  workout: {
    id: number;
    title: string;
    dayLabel: string | null;
    focus: string | null;
    notes: string | null;
  };
  exercises: WorkoutFormExercise[];
  existingLog: WorkoutFormLog | null;
};

export function getCurrentWeekBounds(referenceDate = new Date()) {
  return {
    start: getWeekStart(referenceDate),
    end: getWeekEnd(referenceDate),
  };
}

function normalizeImageUrls(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function parseNeedsTranslation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return (value as { needsTranslation?: unknown }).needsTranslation === true;
}

function buildPreviousLogCutoff(currentLog: { id: number; performedAt: Date } | null) {
  if (!currentLog) {
    return {};
  }

  return {
    OR: [
      {
        performedAt: {
          lt: currentLog.performedAt,
        },
      },
      {
        performedAt: currentLog.performedAt,
        id: {
          lt: currentLog.id,
        },
      },
    ],
  };
}

async function getPreviousPerformanceByExercise(
  userId: number,
  exercises: Array<{
    id: number;
    exerciseId: number | null;
  }>,
  currentLog: { id: number; performedAt: Date } | null
) {
  const programExerciseIds = exercises.map((exercise) => exercise.id);
  const exerciseIds = Array.from(
    new Set(
      exercises
        .map((exercise) => exercise.exerciseId)
        .filter((exerciseId): exerciseId is number => exerciseId !== null)
    )
  );

  const setLogFilters = [
    {
      programExerciseId: {
        in: programExerciseIds,
      },
    },
    ...(exerciseIds.length > 0
      ? [
          {
            programExercise: {
              exerciseId: {
                in: exerciseIds,
              },
            },
          },
        ]
      : []),
  ];

  const candidateLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      status: "completed",
      ...buildPreviousLogCutoff(currentLog),
      setLogs: {
        some: {
          OR: setLogFilters,
        },
      },
    },
    orderBy: [{ performedAt: "desc" }, { id: "desc" }],
    take: 40,
    include: {
      setLogs: {
        where: {
          OR: setLogFilters,
        },
        include: {
          programExercise: {
            select: {
              exerciseId: true,
            },
          },
        },
        orderBy: [{ setNumber: "asc" }, { id: "asc" }],
      },
    },
  });

  const previousPerformanceByExerciseId = new Map<
    number,
    {
      performedAt: string;
      status: string;
      sets: WorkoutFormSetLog[];
    }
  >();

  for (const workoutLog of candidateLogs) {
    for (const exercise of exercises) {
      if (previousPerformanceByExerciseId.has(exercise.id)) {
        continue;
      }

      const matchingSetLogs = workoutLog.setLogs.filter((setLog) => {
        if (setLog.programExerciseId === exercise.id) {
          return true;
        }

        return (
          exercise.exerciseId !== null &&
          setLog.programExercise?.exerciseId === exercise.exerciseId
        );
      });

      if (matchingSetLogs.length === 0) {
        continue;
      }

      previousPerformanceByExerciseId.set(exercise.id, {
        performedAt: workoutLog.performedAt.toISOString(),
        status: workoutLog.status,
        sets: matchingSetLogs.map((setLog) => ({
          setNumber: setLog.setNumber,
          actualWeight: setLog.weightKg,
          actualReps: setLog.actualReps,
          actualRir: setLog.rir,
          actualRpe: setLog.rpe,
          completed: setLog.completed,
          notes: setLog.notes ?? "",
        })),
      });
    }

    if (previousPerformanceByExerciseId.size === exercises.length) {
      break;
    }
  }

  return previousPerformanceByExerciseId;
}

export async function getWorkoutPageDataForUser(
  userId: number,
  workoutId: number
): Promise<WorkoutPageData | null> {
  const workout = await prisma.programWorkout.findFirst({
    where: {
      id: workoutId,
      program: {
        userId,
        status: "active",
      },
    },
    include: {
      program: {
        select: {
          id: true,
          workouts: {
            select: {
              id: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
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
              secondaryMuscles: true,
              equipment: true,
              difficulty: true,
              instructions: true,
              imageUrls: true,
              sourceMetadata: true,
            },
          },
        },
      },
    },
  });

  if (!workout) {
    return null;
  }

  const { start, end } = getCurrentWeekBounds();
  const currentWeekLog = await prisma.workoutLog.findFirst({
    where: {
      userId,
      workoutId,
      performedAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      setLogs: {
        orderBy: {
          setNumber: "asc",
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  const workoutSchedule = getWorkoutScheduleForProgram(workout.program.workouts);
  const scheduledWorkout = workoutSchedule.find(
    (scheduledEntry) => scheduledEntry.workout.id === workout.id
  );

  if (!scheduledWorkout) {
    return null;
  }

  const workoutState = getFlexibleWorkoutState({
    plannedDateThisWeek: scheduledWorkout.plannedDateThisWeek,
    plannedDateLabel: scheduledWorkout.plannedDateLabel,
    weekLog: currentWeekLog
      ? {
          id: currentWeekLog.id,
          status: currentWeekLog.status,
          performedAt: currentWeekLog.performedAt,
          startedAt: currentWeekLog.startedAt,
          completedAt: currentWeekLog.completedAt,
          updatedAt: currentWeekLog.updatedAt,
        }
      : null,
  });

  const previousPerformanceByExerciseId = await getPreviousPerformanceByExercise(
    userId,
    workout.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId ?? null,
    })),
    currentWeekLog
      ? {
          id: currentWeekLog.id,
          performedAt: currentWeekLog.performedAt,
        }
      : null
  );

  return {
    programId: workout.program.id,
    workoutState: workoutState.state,
    plannedDateLabel: workoutState.plannedDateLabel,
    plannedDateThisWeek: workoutState.plannedDateThisWeek.toISOString(),
    isPlannedToday: workoutState.isPlannedToday,
    isPastPlannedDate: workoutState.isPastPlannedDate,
    isFuturePlannedDate: workoutState.isFuturePlannedDate,
    workout: {
      id: workout.id,
      title: workout.title,
      dayLabel: workout.dayLabel,
      focus: workout.focus,
      notes: workout.notes,
    },
    exercises: workout.exercises.map((exercise) => {
      const matchingSetLogs = currentWeekLog?.setLogs.filter(
        (setLog) => setLog.programExerciseId === exercise.id
      );
      const previousPerformance = previousPerformanceByExerciseId.get(exercise.id) ?? null;

      return {
        id: exercise.id,
        exerciseId: exercise.exerciseId ?? null,
        name: exercise.name,
        category: exercise.exercise?.category ?? null,
        primaryMuscle: exercise.exercise?.primaryMuscle ?? null,
        secondaryMuscles: normalizeStringArray(exercise.exercise?.secondaryMuscles),
        equipment: exercise.exercise?.equipment ?? null,
        difficulty: exercise.exercise?.difficulty ?? null,
        instructions: exercise.exercise?.instructions ?? null,
        needsTranslation: parseNeedsTranslation(exercise.exercise?.sourceMetadata),
        imageUrls: normalizeImageUrls(exercise.exercise?.imageUrls).slice(0, 2),
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        intensity: exercise.intensity,
        notes: exercise.notes,
        initialSetLogs:
          matchingSetLogs?.map((setLog) => ({
            setNumber: setLog.setNumber,
            actualWeight: setLog.weightKg,
            actualReps: setLog.actualReps,
            actualRir: setLog.rir,
            actualRpe: setLog.rpe,
            completed: setLog.completed,
            notes: setLog.notes ?? "",
          })) ?? [],
        previousPerformance,
        todaySummary:
          matchingSetLogs?.map((setLog) => ({
            setNumber: setLog.setNumber,
            weightKg: setLog.weightKg,
            actualReps: setLog.actualReps,
            rir: setLog.rir,
            completed: setLog.completed,
          })) ?? [],
        progressionSuggestion: generateExerciseProgressionSuggestion({
          plannedExercise: {
            sets: exercise.sets,
            reps: exercise.reps,
            intensity: exercise.intensity,
            restSeconds: exercise.restSeconds,
          },
          previousSets:
            previousPerformance?.sets.map((setLog) => ({
              setNumber: setLog.setNumber,
              weightKg: setLog.actualWeight,
              actualReps: setLog.actualReps,
              rir: setLog.actualRir,
              completed: setLog.completed,
            })) ?? [],
        }),
      };
    }),
    existingLog: currentWeekLog
      ? {
          id: currentWeekLog.id,
          status: currentWeekLog.status,
          perceivedEffort: currentWeekLog.perceivedEffort,
          notes: currentWeekLog.notes,
          startedAt: currentWeekLog.startedAt?.toISOString() ?? null,
          completedAt: currentWeekLog.completedAt?.toISOString() ?? null,
          performedAt: currentWeekLog.performedAt.toISOString(),
        }
      : null,
  };
}
