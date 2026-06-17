import { prisma } from "@/lib/prisma";

export type WorkoutHistoryEntry = {
  id: number;
  performedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
  status: string;
  perceivedEffort: number | null;
  notes: string | null;
  workoutName: string;
  programName: string;
  exercises: Array<{
    programExerciseId: number | null;
    exerciseName: string;
    sets: Array<{
      id: number;
      setNumber: number;
      weightKg: number | null;
      actualReps: number | null;
      rir: number | null;
      completed: boolean;
    }>;
  }>;
};

export function getWorkoutStatusLabel(status: string) {
  if (status === "completed") {
    return "Completato";
  }

  if (status === "in_progress") {
    return "In corso";
  }

  if (status === "skipped") {
    return "Seduta saltata";
  }

  return "Salvato";
}

export async function getWorkoutHistoryForUser(userId: number) {
  const logs = await prisma.workoutLog.findMany({
    where: {
      userId,
    },
    orderBy: [{ performedAt: "desc" }, { id: "desc" }],
    include: {
      workout: {
        select: {
          title: true,
        },
      },
      program: {
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
              sortOrder: true,
            },
          },
        },
        orderBy: [{ setNumber: "asc" }, { id: "asc" }],
      },
    },
  });

  return logs.map<WorkoutHistoryEntry>((log) => {
    const exerciseMap = new Map<
      string,
      WorkoutHistoryEntry["exercises"][number] & { sortOrder: number }
    >();

    for (const setLog of log.setLogs) {
      const exerciseKey = setLog.programExerciseId
        ? `program-exercise-${setLog.programExerciseId}`
        : `set-log-${setLog.id}`;
      const existingExercise = exerciseMap.get(exerciseKey);

      if (existingExercise) {
        existingExercise.sets.push({
          id: setLog.id,
          setNumber: setLog.setNumber,
          weightKg: setLog.weightKg,
          actualReps: setLog.actualReps,
          rir: setLog.rir,
          completed: setLog.completed,
        });
        continue;
      }

      exerciseMap.set(exerciseKey, {
        programExerciseId: setLog.programExerciseId,
        exerciseName: setLog.programExercise?.name ?? `Esercizio ${setLog.id}`,
        sortOrder: setLog.programExercise?.sortOrder ?? Number.MAX_SAFE_INTEGER,
        sets: [
          {
            id: setLog.id,
            setNumber: setLog.setNumber,
            weightKg: setLog.weightKg,
            actualReps: setLog.actualReps,
            rir: setLog.rir,
            completed: setLog.completed,
          },
        ],
      });
    }

    const exercises = Array.from(exerciseMap.values())
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.exerciseName.localeCompare(right.exerciseName, "it");
      })
      .map(({ sortOrder: _sortOrder, ...exercise }) => exercise);

    return {
      id: log.id,
      performedAt: log.performedAt,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      updatedAt: log.updatedAt,
      status: log.status,
      perceivedEffort: log.perceivedEffort,
      notes: log.notes,
      workoutName: log.workout?.title ?? "Seduta",
      programName: log.program?.title ?? "Programma",
      exercises,
    };
  });
}

export async function getLatestCompletedWorkoutForUser(userId: number) {
  return prisma.workoutLog.findFirst({
    where: {
      userId,
      status: "completed",
    },
    orderBy: [{ completedAt: "desc" }, { performedAt: "desc" }, { id: "desc" }],
    include: {
      workout: {
        select: {
          title: true,
        },
      },
      program: {
        select: {
          title: true,
        },
      },
    },
  });
}
