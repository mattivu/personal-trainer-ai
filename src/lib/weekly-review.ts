import { prisma } from "@/lib/prisma";
import { getWeekEnd, getWeekStart, getWorkoutScheduleForProgram } from "@/lib/workout-schedule";

export type WeeklyReviewStatus =
  | "Settimana solida"
  | "Settimana incompleta"
  | "Fatica alta"
  | "Serve continuita"
  | "Dati insufficienti";

export type WeeklyReviewRecommendation =
  | "Continua cosi"
  | "Recupera una seduta"
  | "Mantieni i carichi"
  | "Evita di forzare la progressione questa settimana"
  | "Riduci leggermente l'intensita se la fatica e alta"
  | "Compila meglio i dati delle serie per rendere i consigli piu precisi";

type ReviewRange = {
  start: Date;
  end: Date;
  isCurrentWeek: boolean;
};

type ProgramExerciseSnapshot = {
  id: number;
  exerciseId: number | null;
  name: string;
  sets: number | null;
};

type CompletedWorkoutLog = {
  id: number;
  performedAt: Date;
  workoutId: number | null;
  notes: string | null;
  setLogs: Array<{
    id: number;
    programExerciseId: number | null;
    setNumber: number;
    actualReps: number | null;
    weightKg: number | null;
    rir: number | null;
    completed: boolean;
    notes: string | null;
    programExercise: {
      exerciseId: number | null;
    } | null;
  }>;
};

export type WeeklyReviewData = {
  activeProgram: {
    id: number;
    title: string;
  } | null;
  week: {
    start: Date;
    end: Date;
    isCurrentWeek: boolean;
  };
  plannedSessions: number;
  completedSessions: number;
  skippedSessions: number;
  remainingSessions: number;
  catchUpSessions: number;
  pendingSessions: number;
  averagePerceivedEffort: number | null;
  positiveProgressExercises: number;
  incompleteDataExercises: number;
  status: WeeklyReviewStatus;
  recommendation: WeeklyReviewRecommendation;
  adherenceSummary: string;
  progressSummary: string;
  criticalitySummary: string;
  riskSignals: string[];
  cautions: string[];
};

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function getDayOffsetFromMonday(date: Date) {
  return (date.getDay() + 6) % 7;
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return roundToSingleDecimal(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function hasUsefulSetData(setLog: {
  actualReps: number | null;
  weightKg: number | null;
  rir: number | null;
  completed: boolean;
  notes?: string | null;
}) {
  return (
    setLog.actualReps !== null ||
    setLog.weightKg !== null ||
    setLog.rir !== null ||
    setLog.completed ||
    Boolean(setLog.notes?.trim())
  );
}

function isCurrentExerciseDataIncomplete(
  currentSets: Array<{
    actualReps: number | null;
    weightKg: number | null;
    rir: number | null;
    completed: boolean;
    notes?: string | null;
  }>,
  plannedSets: number | null
) {
  if (currentSets.length === 0) {
    return true;
  }

  const usefulSetCount = currentSets.filter(hasUsefulSetData).length;
  const expectedUsefulSetCount = plannedSets && plannedSets > 0 ? Math.max(1, plannedSets) : 1;

  return usefulSetCount < Math.max(1, Math.ceil(expectedUsefulSetCount / 2));
}

function buildExerciseLookup(
  workouts: Array<{
    id: number;
    exercises: ProgramExerciseSnapshot[];
  }>
) {
  const lookup = new Map<number, ProgramExerciseSnapshot>();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      lookup.set(exercise.id, exercise);
    }
  }

  return lookup;
}

function compareExerciseProgress(input: {
  currentSets: CompletedWorkoutLog["setLogs"];
  previousSets: CompletedWorkoutLog["setLogs"];
}) {
  const currentUsefulSets = input.currentSets.filter(hasUsefulSetData);
  const previousUsefulSets = input.previousSets.filter(hasUsefulSetData);

  if (currentUsefulSets.length === 0 || previousUsefulSets.length === 0) {
    return false;
  }

  const currentTotalReps = currentUsefulSets.reduce(
    (sum, setLog) => sum + (setLog.actualReps ?? 0),
    0
  );
  const previousTotalReps = previousUsefulSets.reduce(
    (sum, setLog) => sum + (setLog.actualReps ?? 0),
    0
  );
  const currentCompletedSets = currentUsefulSets.filter((setLog) => setLog.completed).length;
  const previousCompletedSets = previousUsefulSets.filter((setLog) => setLog.completed).length;
  const currentWeightValues = currentUsefulSets
    .map((setLog) => setLog.weightKg)
    .filter((value): value is number => value !== null);
  const previousWeightValues = previousUsefulSets
    .map((setLog) => setLog.weightKg)
    .filter((value): value is number => value !== null);
  const currentAverageWeight = average(currentWeightValues);
  const previousAverageWeight = average(previousWeightValues);

  if (currentCompletedSets < previousCompletedSets) {
    return false;
  }

  if (currentTotalReps > previousTotalReps) {
    return true;
  }

  return (
    currentAverageWeight !== null &&
    previousAverageWeight !== null &&
    currentAverageWeight > previousAverageWeight &&
    currentTotalReps >= Math.max(previousTotalReps - 1, 0)
  );
}

function getPreviousCompletedSetsForExercise(input: {
  currentLog: CompletedWorkoutLog;
  allCompletedLogs: CompletedWorkoutLog[];
  programExerciseId: number;
  exerciseId: number | null;
}) {
  for (const completedLog of input.allCompletedLogs) {
    const isBeforeCurrentLog =
      completedLog.performedAt < input.currentLog.performedAt ||
      (completedLog.performedAt.getTime() === input.currentLog.performedAt.getTime() &&
        completedLog.id < input.currentLog.id);

    if (!isBeforeCurrentLog) {
      continue;
    }

    const matchingSets = completedLog.setLogs.filter((setLog) => {
      if (setLog.programExerciseId === input.programExerciseId) {
        return true;
      }

      return (
        input.exerciseId !== null &&
        setLog.programExercise?.exerciseId === input.exerciseId
      );
    });

    if (matchingSets.some(hasUsefulSetData)) {
      return matchingSets;
    }
  }

  return [];
}

async function buildReviewForRange(
  userId: number,
  range: ReviewRange,
  activeProgram: {
    id: number;
    title: string;
    workouts: Array<{
      id: number;
      title: string;
      sortOrder: number;
      exercises: ProgramExerciseSnapshot[];
    }>;
  }
): Promise<WeeklyReviewData> {
  const weekLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      programId: activeProgram.id,
      performedAt: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      setLogs: {
        include: {
          programExercise: {
            select: {
              exerciseId: true,
            },
          },
        },
        orderBy: [{ setNumber: "asc" }, { id: "asc" }],
      },
      workout: {
        select: {
          id: true,
        },
      },
    },
    orderBy: [{ performedAt: "desc" }, { id: "desc" }],
  });

  const schedule = getWorkoutScheduleForProgram(activeProgram.workouts, addDays(range.start, 2));
  const referenceDate = range.isCurrentWeek ? new Date() : range.end;
  const logByWorkoutId = new Map<number, (typeof weekLogs)[number]>();

  for (const workoutLog of weekLogs) {
    if (!workoutLog.workoutId || logByWorkoutId.has(workoutLog.workoutId)) {
      continue;
    }

    logByWorkoutId.set(workoutLog.workoutId, workoutLog);
  }

  let completedSessions = 0;
  let skippedSessions = 0;
  let remainingSessions = 0;
  let catchUpSessions = 0;

  for (const scheduledWorkout of schedule) {
    const workoutLog = logByWorkoutId.get(scheduledWorkout.workout.id);

    if (workoutLog?.status === "completed") {
      completedSessions += 1;
      continue;
    }

    if (workoutLog?.status === "skipped") {
      skippedSessions += 1;
      continue;
    }

    const shouldRecover = !range.isCurrentWeek || scheduledWorkout.plannedDateThisWeek < referenceDate;

    if (shouldRecover) {
      catchUpSessions += 1;
    } else {
      remainingSessions += 1;
    }
  }

  const plannedSessions = schedule.length;
  const pendingSessions = remainingSessions + catchUpSessions;
  const completedLogs = weekLogs.filter((workoutLog) => workoutLog.status === "completed");
  const perceivedEffortValues = completedLogs
    .map((workoutLog) => workoutLog.perceivedEffort)
    .filter((value): value is number => value !== null);
  const averagePerceivedEffort = average(perceivedEffortValues);
  const allSetLogs = completedLogs.flatMap((workoutLog) => workoutLog.setLogs);
  const loggedSetCount = allSetLogs.length;
  const completedSetCount = allSetLogs.filter((setLog) => setLog.completed).length;
  const nonCompletedSetCount = loggedSetCount - completedSetCount;
  const plannedSetCount = activeProgram.workouts.reduce(
    (totalSets, workout) =>
      totalSets +
      workout.exercises.reduce(
        (exerciseTotal, exercise) => exerciseTotal + (exercise.sets && exercise.sets > 0 ? exercise.sets : 0),
        0
      ),
    0
  );
  const volumeCompletionRatio =
    plannedSetCount > 0 ? roundToSingleDecimal(completedSetCount / plannedSetCount) : null;
  const lowRirValues = allSetLogs
    .map((setLog) => setLog.rir)
    .filter((value): value is number => value !== null);
  const lowRirSetCount = lowRirValues.filter((value) => value <= 0).length;
  const highFatigueSessions = completedLogs.filter(
    (workoutLog) => workoutLog.perceivedEffort !== null && workoutLog.perceivedEffort >= 8
  ).length;
  const highSkipRisk =
    plannedSessions >= 2 && skippedSessions >= Math.max(2, Math.ceil(plannedSessions * 0.4));
  const highFatigueRisk = highFatigueSessions >= 2;
  const lowRirRisk =
    lowRirValues.length >= 4 &&
    lowRirSetCount >= Math.max(2, Math.ceil(lowRirValues.length * 0.35));
  const incompleteSetsRisk =
    loggedSetCount >= 6 &&
    nonCompletedSetCount >= Math.max(3, Math.ceil(loggedSetCount * 0.35));
  const volumeRisk =
    plannedSetCount >= 6 && volumeCompletionRatio !== null && volumeCompletionRatio < 0.7;

  const exerciseLookup = buildExerciseLookup(activeProgram.workouts);
  const allCompletedLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      status: "completed",
      performedAt: {
        lte: range.end,
      },
      setLogs: {
        some: {
          programExerciseId: {
            in: Array.from(exerciseLookup.keys()),
          },
        },
      },
    },
    include: {
      setLogs: {
        where: {
          programExerciseId: {
            in: Array.from(exerciseLookup.keys()),
          },
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
    orderBy: [{ performedAt: "desc" }, { id: "desc" }],
    take: 120,
  });

  let positiveProgressExercises = 0;
  let incompleteDataExercises = 0;

  for (const completedLog of completedLogs) {
    const exerciseIdsInLog = Array.from(
      new Set(
        completedLog.setLogs
          .map((setLog) => setLog.programExerciseId)
          .filter((programExerciseId): programExerciseId is number => programExerciseId !== null)
      )
    );

    for (const programExerciseId of exerciseIdsInLog) {
      const programExercise = exerciseLookup.get(programExerciseId);
      const currentSets = completedLog.setLogs.filter(
        (setLog) => setLog.programExerciseId === programExerciseId
      );

      if (isCurrentExerciseDataIncomplete(currentSets, programExercise?.sets ?? null)) {
        incompleteDataExercises += 1;
        continue;
      }

      const previousSets = getPreviousCompletedSetsForExercise({
        currentLog: completedLog as CompletedWorkoutLog,
        allCompletedLogs: allCompletedLogs as CompletedWorkoutLog[],
        programExerciseId,
        exerciseId: programExercise?.exerciseId ?? null,
      });

      if (
        previousSets.length > 0 &&
        compareExerciseProgress({
          currentSets: currentSets as CompletedWorkoutLog["setLogs"],
          previousSets: previousSets as CompletedWorkoutLog["setLogs"],
        })
      ) {
        positiveProgressExercises += 1;
      }
    }
  }

  const notesToInspect = [
    ...weekLogs.map((workoutLog) => workoutLog.notes ?? ""),
    ...weekLogs.flatMap((workoutLog) => workoutLog.setLogs.map((setLog) => setLog.notes ?? "")),
  ]
    .join(" ")
    .toLowerCase();
  const painSignal = /(dolor|male|fastid|infortun|stirament|vertigin|capogir|nausea|pain)/.test(
    notesToInspect
  );

  const riskSignals: string[] = [];
  const cautions: string[] = [];

  if (highSkipRisk) {
    riskSignals.push("Hai saltato troppe sedute rispetto a quelle previste.");
  }

  if (highFatigueRisk) {
    riskSignals.push("La fatica percepita e stata alta in piu sedute.");
  }

  if (lowRirRisk) {
    riskSignals.push("Sei arrivato troppo spesso vicino al cedimento.");
  }

  if (incompleteSetsRisk) {
    riskSignals.push("Molte serie risultano non completate.");
  }

  if (volumeRisk) {
    riskSignals.push("Il volume svolto e rimasto molto sotto al previsto.");
  }

  if (painSignal) {
    cautions.push(
      "Se compaiono dolore, sintomi insoliti o fastidi che peggiorano, riduci il carico e valuta un professionista."
    );
  }

  if (highFatigueRisk || lowRirRisk || volumeRisk) {
    cautions.push(
      "Questa settimana richiede prudenza: evita aumenti aggressivi e privilegia tecnica, recupero e controllo."
    );
  }

  const notEnoughData =
    completedLogs.length === 0 ||
    (perceivedEffortValues.length === 0 && loggedSetCount === 0) ||
    incompleteDataExercises >= Math.max(2, completedLogs.length);

  let status: WeeklyReviewStatus = "Settimana solida";

  if (notEnoughData) {
    status = "Dati insufficienti";
  } else if (highFatigueRisk || lowRirRisk) {
    status = "Fatica alta";
  } else if (highSkipRisk || catchUpSessions >= 2 || completedSessions === 0) {
    status = "Serve continuita";
  } else if (skippedSessions > 0 || catchUpSessions > 0 || (!range.isCurrentWeek && pendingSessions > 0)) {
    status = "Settimana incompleta";
  }

  let recommendation: WeeklyReviewRecommendation = "Continua cosi";

  if (notEnoughData) {
    recommendation = "Compila meglio i dati delle serie per rendere i consigli piu precisi";
  } else if (highFatigueRisk) {
    recommendation = "Riduci leggermente l'intensita se la fatica e alta";
  } else if (lowRirRisk || incompleteSetsRisk || volumeRisk) {
    recommendation = "Evita di forzare la progressione questa settimana";
  } else if (catchUpSessions > 0 || skippedSessions > 0) {
    recommendation = "Recupera una seduta";
  } else if (positiveProgressExercises === 0 && completedSessions > 0) {
    recommendation = "Mantieni i carichi";
  }

  const adherenceSummary = `${completedSessions}/${plannedSessions} sedute completate, ${skippedSessions} saltate e ${pendingSessions} ancora da chiudere.`;
  const progressSummary =
    positiveProgressExercises > 0
      ? `${positiveProgressExercises} esercizi mostrano un progresso positivo rispetto ai riferimenti precedenti.`
      : completedSessions > 0
        ? "Non emergono progressi netti da spingere subito: meglio consolidare."
        : "Mancano sedute completate sufficienti per leggere i progressi.";
  const criticalitySummary =
    riskSignals.length > 0
      ? riskSignals[0]
      : incompleteDataExercises > 0
        ? `${incompleteDataExercises} esercizi hanno dati troppo incompleti per una lettura affidabile.`
        : "Non emergono criticita rilevanti dai dati disponibili.";

  return {
    activeProgram: {
      id: activeProgram.id,
      title: activeProgram.title,
    },
    week: {
      start: range.start,
      end: range.end,
      isCurrentWeek: range.isCurrentWeek,
    },
    plannedSessions,
    completedSessions,
    skippedSessions,
    remainingSessions,
    catchUpSessions,
    pendingSessions,
    averagePerceivedEffort,
    positiveProgressExercises,
    incompleteDataExercises,
    status,
    recommendation,
    adherenceSummary,
    progressSummary,
    criticalitySummary,
    riskSignals,
    cautions,
  };
}

export async function getWeeklyReviewForUser(
  userId: number,
  referenceDate = new Date()
): Promise<WeeklyReviewData> {
  const activeProgram = await prisma.trainingProgram.findFirst({
    where: {
      userId,
      status: "active",
    },
    select: {
      id: true,
      title: true,
      workouts: {
        where: {
          exercises: {
            some: {
              isActive: true,
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          exercises: {
            where: {
              isActive: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              id: true,
              exerciseId: true,
              name: true,
              sets: true,
            },
          },
        },
      },
    },
  });

  const currentWeekRange: ReviewRange = {
    start: getWeekStart(referenceDate),
    end: getWeekEnd(referenceDate),
    isCurrentWeek: true,
  };

  if (!activeProgram || activeProgram.workouts.length === 0) {
    return {
      activeProgram: activeProgram
        ? {
            id: activeProgram.id,
            title: activeProgram.title,
          }
        : null,
      week: currentWeekRange,
      plannedSessions: activeProgram?.workouts.length ?? 0,
      completedSessions: 0,
      skippedSessions: 0,
      remainingSessions: activeProgram?.workouts.length ?? 0,
      catchUpSessions: 0,
      pendingSessions: activeProgram?.workouts.length ?? 0,
      averagePerceivedEffort: null,
      positiveProgressExercises: 0,
      incompleteDataExercises: 0,
      status: "Dati insufficienti",
      recommendation: "Compila meglio i dati delle serie per rendere i consigli piu precisi",
      adherenceSummary: "Non ci sono ancora dati abbastanza solidi per una revisione utile.",
      progressSummary: "Mancano riferimenti affidabili sui progressi.",
      criticalitySummary: "Serve almeno un programma attivo con sedute tracciate.",
      riskSignals: [],
      cautions: [],
    };
  }

  const currentWeekReview = await buildReviewForRange(userId, currentWeekRange, activeProgram);

  if (getDayOffsetFromMonday(referenceDate) !== 0) {
    return currentWeekReview;
  }

  const shouldFallbackToPreviousWeek =
    currentWeekReview.completedSessions === 0 &&
    currentWeekReview.skippedSessions === 0 &&
    currentWeekReview.pendingSessions === currentWeekReview.plannedSessions;

  if (!shouldFallbackToPreviousWeek) {
    return currentWeekReview;
  }

  const previousWeekReference = addDays(currentWeekRange.start, -1);
  const previousWeekReview = await buildReviewForRange(
    userId,
    {
      start: getWeekStart(previousWeekReference),
      end: getWeekEnd(previousWeekReference),
      isCurrentWeek: false,
    },
    activeProgram
  );

  return previousWeekReview.completedSessions > 0 || previousWeekReview.skippedSessions > 0
    ? previousWeekReview
    : currentWeekReview;
}
