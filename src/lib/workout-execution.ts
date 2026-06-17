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
  name: string;
  primaryMuscle: string | null;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  intensity: string | null;
  notes: string | null;
  initialSetLogs: WorkoutFormSetLog[];
};

export type WorkoutFormLog = {
  id: number;
  status: string;
  perceivedEffort: number | null;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
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
        }
      : null,
  };
}
