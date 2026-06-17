import { prisma } from "@/lib/prisma";

export type WorkoutFormSetLog = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  actualRir: number | null;
  actualRpe: number | null;
  completed: boolean;
  notes: string;
};

export type WorkoutFormExercise = {
  id: number;
  exerciseId: number | null;
  name: string;
  primaryMuscle: string | null;
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

export function getCurrentDayBounds(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
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

  async function findCandidates(statusWhere: { status: string } | { status: { not: string } }) {
    return prisma.workoutLog.findMany({
      where: {
        userId,
        ...statusWhere,
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
  }

  const previousPerformanceByExerciseId = new Map<
    number,
    {
      performedAt: string;
      status: string;
      sets: WorkoutFormSetLog[];
    }
  >();

  function hydrateFromCandidates(
    candidateLogs: Awaited<ReturnType<typeof findCandidates>>
  ) {
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
        return;
      }
    }
  }

  hydrateFromCandidates(await findCandidates({ status: "completed" }));

  if (previousPerformanceByExerciseId.size < exercises.length) {
    hydrateFromCandidates(await findCandidates({ status: { not: "completed" } }));
  }

  return previousPerformanceByExerciseId;
}

export async function getWorkoutPageDataForUser(
  userId: number,
  workoutId: number
): Promise<WorkoutPageData | null> {
  const { start, end } = getCurrentDayBounds();

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
        },
      },
      exercises: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          exercise: {
            select: {
              primaryMuscle: true,
            },
          },
        },
      },
      workoutLogs: {
        where: {
          userId,
          performedAt: {
            gte: start,
            lt: end,
          },
        },
        include: {
          setLogs: {
            orderBy: {
              setNumber: "asc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!workout) {
    return null;
  }

  const currentLog = workout.workoutLogs[0] ?? null;
  const previousPerformanceByExerciseId = await getPreviousPerformanceByExercise(
    userId,
    workout.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId ?? null,
    })),
    currentLog
      ? {
          id: currentLog.id,
          performedAt: currentLog.performedAt,
        }
      : null
  );

  return {
    programId: workout.program.id,
    workout: {
      id: workout.id,
      title: workout.title,
      dayLabel: workout.dayLabel,
      focus: workout.focus,
      notes: workout.notes,
    },
    exercises: workout.exercises.map((exercise) => {
      const matchingSetLogs = currentLog?.setLogs.filter(
        (setLog) => setLog.programExerciseId === exercise.id
      );

      return {
        id: exercise.id,
        exerciseId: exercise.exerciseId ?? null,
        name: exercise.name,
        primaryMuscle: exercise.exercise?.primaryMuscle ?? null,
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
        previousPerformance: previousPerformanceByExerciseId.get(exercise.id) ?? null,
      };
    }),
    existingLog: currentLog
      ? {
          id: currentLog.id,
          status: currentLog.status,
          perceivedEffort: currentLog.perceivedEffort,
          notes: currentLog.notes,
          startedAt: currentLog.startedAt?.toISOString() ?? null,
          completedAt: currentLog.completedAt?.toISOString() ?? null,
          performedAt: currentLog.performedAt.toISOString(),
        }
      : null,
  };
}
