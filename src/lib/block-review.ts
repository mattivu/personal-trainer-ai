import { prisma } from "@/lib/prisma";
import { buildNormalizedOnboardingProfile } from "@/lib/training-engine/onboarding-profile";
import { getCurrentBlockWeek, getTrainingBlockDurationWeeks } from "@/lib/training-engine/program-block";
import { getPlannedWorkoutDay } from "@/lib/workout-schedule";

export type BlockReviewLifecycleStatus =
  | "In corso"
  | "Quasi concluso"
  | "Da revisionare"
  | "Dati insufficienti";

export type BlockReviewSignal =
  | "buona aderenza"
  | "bassa aderenza"
  | "fatica alta persistente"
  | "progressi solidi"
  | "stagnazione diffusa"
  | "dati insufficienti"
  | "molte serie non completate"
  | "troppe sedute saltate"
  | "possibile necessita di scarico";

export type BlockReviewSummaryStatus =
  | "Percorso solido"
  | "Percorso incompleto"
  | "Fatica elevata"
  | "Progressi limitati"
  | "Dati insufficienti"
  | "Pronto per revisione";

export type BlockReviewRecommendation =
  | "Continua con il programma attuale"
  | "Completa prima le sedute mancanti"
  | "Riparti da questa fase con piu continuita"
  | "Mantieni i carichi e consolida"
  | "Valuta una settimana piu leggera"
  | "Aggiorna obiettivo e risposte iniziali prima della prossima fase"
  | "Puoi preparare la fase successiva";

type ExerciseProgressBucket = "positive" | "stagnant" | "insufficient";

type BlockReviewMetric = {
  label: string;
  value: string;
  hint: string;
};

export type BlockReviewData = {
  activeProgram: {
    id: number;
    title: string;
  } | null;
  block: {
    currentWeek: number;
    durationWeeks: number;
    startedAt: Date | null;
    plannedReviewAt: Date | null;
    status: BlockReviewLifecycleStatus;
  };
  summaryStatus: BlockReviewSummaryStatus;
  recommendation: BlockReviewRecommendation;
  metrics: {
    plannedSessionsToDate: number;
    completedSessions: number;
    skippedSessions: number;
    missedSessions: number;
    adherencePercentage: number | null;
    averagePerceivedEffort: number | null;
    positiveProgressExercises: number;
    stagnantExercises: number;
    insufficientExerciseData: number;
    veryLowRirFrequency: number | null;
    incompleteSets: number;
    swappedExercises: number;
    dataQualityScore: number | null;
    dataQualityLabel: string;
  };
  keyMetrics: BlockReviewMetric[];
  signals: BlockReviewSignal[];
  summaries: {
    adherence: string;
    progress: string;
    criticality: string;
  };
  cautions: string[];
  disclaimer: string;
};

type ProgramExerciseSnapshot = {
  id: number;
  exerciseId: number | null;
  name: string;
  sets: number | null;
  isActive: boolean;
  replacedAt: Date | null;
  replacedByProgramExerciseId: number | null;
  replacementReason: string | null;
};

type CompletedWorkoutLog = {
  id: number;
  performedAt: Date;
  perceivedEffort: number | null;
  notes: string | null;
  setLogs: Array<{
    id: number;
    programExerciseId: number | null;
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

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function getFallbackDurationWeeks(goal: string | null) {
  const normalizedGoal = (goal ?? "").toLowerCase();

  if (
    normalizedGoal.includes("perdita") ||
    normalizedGoal.includes("wellness") ||
    normalizedGoal.includes("benessere")
  ) {
    return 4;
  }

  return getTrainingBlockDurationWeeks("unknown");
}

function getProgramStartedAt(program: {
  startedAt: Date | null;
  startDate: Date | null;
  createdAt: Date;
}) {
  return program.startedAt ?? program.startDate ?? program.createdAt;
}

function getProgramDurationWeeks(program: {
  durationWeeks: number | null;
  goal: string | null;
}) {
  return program.durationWeeks ?? getFallbackDurationWeeks(program.goal);
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

function ratioToPercentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 100);
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

function buildExerciseLookup(
  workouts: Array<{
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

function getExerciseMetricKey(setLog: {
  programExerciseId: number | null;
  programExercise: {
    exerciseId: number | null;
  } | null;
}) {
  if (setLog.programExercise?.exerciseId !== null && setLog.programExercise?.exerciseId !== undefined) {
    return `exercise:${setLog.programExercise.exerciseId}`;
  }

  if (setLog.programExerciseId !== null) {
    return `program-exercise:${setLog.programExerciseId}`;
  }

  return null;
}

function getDataQualityLabel(score: number | null) {
  if (score === null) {
    return "Non disponibile";
  }

  if (score >= 0.8) {
    return `Alta (${Math.round(score * 100)}%)`;
  }

  if (score >= 0.55) {
    return `Media (${Math.round(score * 100)}%)`;
  }

  return `Bassa (${Math.round(score * 100)}%)`;
}

function getScheduledDatesForBlock(input: {
  startedAt: Date;
  durationWeeks: number;
  workouts: Array<{ id: number }>;
  now: Date;
}) {
  const scheduledSessions: Array<{
    workoutId: number;
    plannedDate: Date;
    weekIndex: number;
  }> = [];

  for (let weekIndex = 0; weekIndex < input.durationWeeks; weekIndex += 1) {
    const weekStart = addDays(input.startedAt, weekIndex * 7);

    input.workouts.forEach((workout, workoutIndex) => {
      const plannedDay = getPlannedWorkoutDay(workoutIndex, input.workouts.length);
      const plannedDate = addDays(weekStart, plannedDay.dayOffset);

      if (plannedDate <= input.now) {
        scheduledSessions.push({
          workoutId: workout.id,
          plannedDate,
          weekIndex,
        });
      }
    });
  }

  return scheduledSessions;
}

function buildPainCaution(notes: string) {
  const normalizedNotes = notes.toLowerCase();
  const painSignal =
    /(dolor|male|fastid|infortun|stirament|vertigin|capogir|nausea|sintom|pain|symptom)/.test(
      normalizedNotes
    );
  const excessiveFatigueSignal =
    /(fatica eccessiva|sfiniment|esaust|stanch|spomp|scarico urgente|troppo pesante)/.test(
      normalizedNotes
    );

  if (!painSignal && !excessiveFatigueSignal) {
    return [];
  }

  const cautions = [
    "Se compaiono dolore, fastidi importanti o sintomi insoliti, riduci il carico e muoviti con cautela.",
  ];

  if (painSignal || excessiveFatigueSignal) {
    cautions.push(
      "Questa revisione non fa diagnosi: se il problema persiste o peggiora, valuta un professionista qualificato."
    );
  }

  return cautions;
}

function buildEmptyBlockReview(referenceDate: Date): BlockReviewData {
  return {
    activeProgram: null,
    block: {
      currentWeek: 0,
      durationWeeks: 0,
      startedAt: null,
      plannedReviewAt: null,
      status: "Dati insufficienti",
    },
    summaryStatus: "Dati insufficienti",
    recommendation: "Completa prima le sedute mancanti",
    metrics: {
      plannedSessionsToDate: 0,
      completedSessions: 0,
      skippedSessions: 0,
      missedSessions: 0,
      adherencePercentage: null,
      averagePerceivedEffort: null,
      positiveProgressExercises: 0,
      stagnantExercises: 0,
      insufficientExerciseData: 0,
      veryLowRirFrequency: null,
      incompleteSets: 0,
      swappedExercises: 0,
      dataQualityScore: null,
      dataQualityLabel: "Non disponibile",
    },
    keyMetrics: [
      {
        label: "Sedute previste fino a oggi",
        value: "0",
        hint: "Serve un programma attivo per iniziare la revisione.",
      },
    ],
    signals: ["dati insufficienti"],
    summaries: {
      adherence: "Non c'e un programma attivo da rivedere.",
      progress: "Mancano dati utili per leggere l'andamento del percorso.",
      criticality: "Serve prima un programma attivo con sedute registrate.",
    },
    cautions: [],
    disclaimer: "Questa revisione non modifica automaticamente il programma.",
  };
}

export async function getBlockReviewForUser(
  userId: number,
  now = new Date()
): Promise<BlockReviewData> {
  const activeProgram = await prisma.trainingProgram.findFirst({
    where: {
      userId,
      status: "active",
    },
    select: {
      id: true,
      title: true,
      goal: true,
      durationWeeks: true,
      startedAt: true,
      startDate: true,
      createdAt: true,
      plannedReviewAt: true,
      onboardingSnapshotHash: true,
      notes: true,
      workouts: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          exercises: {
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              id: true,
              exerciseId: true,
              name: true,
              sets: true,
              isActive: true,
              replacedAt: true,
              replacedByProgramExerciseId: true,
              replacementReason: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!activeProgram || activeProgram.workouts.length === 0) {
    return buildEmptyBlockReview(now);
  }

  const startedAt = getProgramStartedAt(activeProgram);
  const durationWeeks = getProgramDurationWeeks(activeProgram);
  const currentWeek = getCurrentBlockWeek(startedAt, durationWeeks, now);
  const plannedReviewAt =
    activeProgram.plannedReviewAt ??
    addDays(startedAt, durationWeeks * 7);

  const [workoutLogs, onboardingAnswers] = await Promise.all([
    prisma.workoutLog.findMany({
      where: {
        userId,
        programId: activeProgram.id,
        performedAt: {
          gte: startedAt,
          lte: now,
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
      },
      orderBy: [{ performedAt: "asc" }, { id: "asc" }],
    }),
    prisma.onboardingAnswer.findMany({
      where: {
        userId,
      },
      select: {
        answersJson: true,
      },
    }),
  ]);

  const exerciseLookup = buildExerciseLookup(activeProgram.workouts);
  const scheduledSessions = getScheduledDatesForBlock({
    startedAt,
    durationWeeks,
    workouts: activeProgram.workouts,
    now,
  });
  const scheduledSessionKeys = new Set(
    scheduledSessions.map((session) => `${session.weekIndex}:${session.workoutId}`)
  );

  const logByScheduledSession = new Map<string, (typeof workoutLogs)[number]>();

  for (const workoutLog of workoutLogs) {
    if (!workoutLog.workoutId) {
      continue;
    }

    const elapsedMs = workoutLog.performedAt.getTime() - startedAt.getTime();

    if (elapsedMs < 0) {
      continue;
    }

    const weekIndex = Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000));
    const key = `${weekIndex}:${workoutLog.workoutId}`;

    if (!scheduledSessionKeys.has(key)) {
      continue;
    }

    const current = logByScheduledSession.get(key);

    if (
      !current ||
      workoutLog.performedAt > current.performedAt ||
      (workoutLog.performedAt.getTime() === current.performedAt.getTime() &&
        workoutLog.id > current.id)
    ) {
      logByScheduledSession.set(key, workoutLog);
    }
  }

  let completedSessions = 0;
  let skippedSessions = 0;
  let missedSessions = 0;

  for (const scheduledSession of scheduledSessions) {
    const key = `${scheduledSession.weekIndex}:${scheduledSession.workoutId}`;
    const workoutLog = logByScheduledSession.get(key);

    if (workoutLog?.status === "completed") {
      completedSessions += 1;
      continue;
    }

    if (workoutLog?.status === "skipped") {
      skippedSessions += 1;
      continue;
    }

    missedSessions += 1;
  }

  const plannedSessionsToDate = scheduledSessions.length;
  const adherencePercentage = ratioToPercentage(completedSessions, plannedSessionsToDate);
  const completedLogs = workoutLogs.filter((workoutLog) => workoutLog.status === "completed");
  const perceivedEffortValues = completedLogs
    .map((workoutLog) => workoutLog.perceivedEffort)
    .filter((value): value is number => value !== null);
  const averagePerceivedEffort = average(perceivedEffortValues);
  const allSetLogs = completedLogs.flatMap((workoutLog) => workoutLog.setLogs);
  const usefulSetCount = allSetLogs.filter(hasUsefulSetData).length;
  const completedSetCount = allSetLogs.filter((setLog) => setLog.completed).length;
  const incompleteSets = allSetLogs.filter((setLog) => !setLog.completed).length;
  const lowRirValues = allSetLogs
    .map((setLog) => setLog.rir)
    .filter((value): value is number => value !== null);
  const veryLowRirCount = lowRirValues.filter((value) => value <= 1).length;
  const veryLowRirFrequency =
    lowRirValues.length > 0 ? roundToSingleDecimal(veryLowRirCount / lowRirValues.length) : null;

  const plannedSetCountToDate = scheduledSessions.reduce((total, session) => {
    const workout = activeProgram.workouts.find((item) => item.id === session.workoutId);

    if (!workout) {
      return total;
    }

    return (
      total +
      workout.exercises.reduce((exerciseTotal, exercise) => {
        return exerciseTotal + (exercise.sets && exercise.sets > 0 ? exercise.sets : 0);
      }, 0)
    );
  }, 0);
  const dataQualityScore =
    plannedSetCountToDate > 0 ? usefulSetCount / plannedSetCountToDate : null;
  const dataQualityLabel = getDataQualityLabel(dataQualityScore);

  const progressByExercise = new Map<string, ExerciseProgressBucket>();

  for (const completedLog of completedLogs as CompletedWorkoutLog[]) {
    const exerciseIdsInLog = Array.from(
      new Set(
        completedLog.setLogs
          .map((setLog) => setLog.programExerciseId)
          .filter((programExerciseId): programExerciseId is number => programExerciseId !== null)
      )
    );

    for (const programExerciseId of exerciseIdsInLog) {
      const currentSets = completedLog.setLogs.filter(
        (setLog) => setLog.programExerciseId === programExerciseId
      );
      const representativeSet = currentSets[0];
      const metricKey = representativeSet ? getExerciseMetricKey(representativeSet) : null;

      if (!metricKey) {
        continue;
      }

      const programExercise = exerciseLookup.get(programExerciseId);

      if (isCurrentExerciseDataIncomplete(currentSets, programExercise?.sets ?? null)) {
        if (!progressByExercise.has(metricKey)) {
          progressByExercise.set(metricKey, "insufficient");
        }
        continue;
      }

      const previousSets = getPreviousCompletedSetsForExercise({
        currentLog: completedLog,
        allCompletedLogs: completedLogs as CompletedWorkoutLog[],
        programExerciseId,
        exerciseId: programExercise?.exerciseId ?? representativeSet.programExercise?.exerciseId ?? null,
      });

      if (previousSets.length === 0) {
        if (!progressByExercise.has(metricKey)) {
          progressByExercise.set(metricKey, "insufficient");
        }
        continue;
      }

      progressByExercise.set(
        metricKey,
        compareExerciseProgress({
          currentSets,
          previousSets,
        })
          ? "positive"
          : "stagnant"
      );
    }
  }

  let positiveProgressExercises = 0;
  let stagnantExercises = 0;
  let insufficientExerciseData = 0;

  for (const bucket of progressByExercise.values()) {
    if (bucket === "positive") {
      positiveProgressExercises += 1;
    } else if (bucket === "stagnant") {
      stagnantExercises += 1;
    } else {
      insufficientExerciseData += 1;
    }
  }

  const replacementTargets = new Set<number>();

  for (const workout of activeProgram.workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.replacedByProgramExerciseId !== null) {
        replacementTargets.add(exercise.replacedByProgramExerciseId);
      }
    }
  }

  let swappedExercises = 0;

  for (const workout of activeProgram.workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.replacedByProgramExerciseId !== null) {
        swappedExercises += 1;
        continue;
      }

      if (
        exercise.replacementReason &&
        exercise.isActive &&
        !replacementTargets.has(exercise.id)
      ) {
        swappedExercises += 1;
      }
    }
  }

  const notesToInspect = [
    activeProgram.notes ?? "",
    ...workoutLogs.map((workoutLog) => workoutLog.notes ?? ""),
    ...workoutLogs.flatMap((workoutLog) => workoutLog.setLogs.map((setLog) => setLog.notes ?? "")),
  ]
    .join(" ")
    .trim();

  const cautions = buildPainCaution(notesToInspect);
  const onboardingChanged =
    activeProgram.onboardingSnapshotHash && onboardingAnswers.length > 0
      ? buildNormalizedOnboardingProfile(onboardingAnswers.map((entry) => entry.answersJson))
          .snapshotHash !== activeProgram.onboardingSnapshotHash
      : false;

  const trackedExercises = positiveProgressExercises + stagnantExercises + insufficientExerciseData;
  const goodAdherence = plannedSessionsToDate >= 2 && (adherencePercentage ?? 0) >= 80;
  const tooManySkipped =
    plannedSessionsToDate >= 2 &&
    skippedSessions + missedSessions >= Math.max(2, Math.ceil(plannedSessionsToDate * 0.35));
  const lowAdherence =
    plannedSessionsToDate >= 2 &&
    ((adherencePercentage ?? 0) < 60 || tooManySkipped);
  const highFatigueSessions = completedLogs.filter(
    (workoutLog) => workoutLog.perceivedEffort !== null && workoutLog.perceivedEffort >= 8
  ).length;
  const persistentHighFatigue =
    completedLogs.length >= 2 &&
    averagePerceivedEffort !== null &&
    averagePerceivedEffort >= 8 &&
    highFatigueSessions >= Math.max(2, Math.ceil(completedLogs.length * 0.5));
  const solidProgress =
    trackedExercises >= 2 &&
    positiveProgressExercises >= Math.max(2, Math.ceil(trackedExercises * 0.4));
  const diffuseStagnation =
    trackedExercises >= 2 &&
    stagnantExercises >= Math.max(2, Math.ceil(trackedExercises * 0.5)) &&
    positiveProgressExercises === 0;
  const insufficientDataSignal =
    completedLogs.length === 0 ||
    plannedSessionsToDate === 0 ||
    dataQualityScore === null ||
    dataQualityScore < 0.45 ||
    insufficientExerciseData >= Math.max(2, trackedExercises - 1);
  const manyIncompleteSets =
    allSetLogs.length >= 6 &&
    incompleteSets >= Math.max(3, Math.ceil(allSetLogs.length * 0.25));
  const possibleDeloadNeed =
    persistentHighFatigue ||
    (veryLowRirFrequency !== null && veryLowRirFrequency >= 0.35) ||
    manyIncompleteSets ||
    cautions.length > 0;

  const signals: BlockReviewSignal[] = [];

  if (goodAdherence) {
    signals.push("buona aderenza");
  }

  if (lowAdherence) {
    signals.push("bassa aderenza");
  }

  if (persistentHighFatigue) {
    signals.push("fatica alta persistente");
  }

  if (solidProgress) {
    signals.push("progressi solidi");
  }

  if (diffuseStagnation) {
    signals.push("stagnazione diffusa");
  }

  if (insufficientDataSignal) {
    signals.push("dati insufficienti");
  }

  if (manyIncompleteSets) {
    signals.push("molte serie non completate");
  }

  if (tooManySkipped) {
    signals.push("troppe sedute saltate");
  }

  if (possibleDeloadNeed) {
    signals.push("possibile necessita di scarico");
  }

  let blockStatus: BlockReviewLifecycleStatus = "In corso";

  if (insufficientDataSignal && completedLogs.length === 0) {
    blockStatus = "Dati insufficienti";
  } else if (now >= plannedReviewAt || currentWeek >= durationWeeks) {
    blockStatus = "Da revisionare";
  } else if (currentWeek >= Math.max(1, durationWeeks - 1)) {
    blockStatus = "Quasi concluso";
  }

  let summaryStatus: BlockReviewSummaryStatus = "Percorso solido";

  if (insufficientDataSignal) {
    summaryStatus = "Dati insufficienti";
  } else if (blockStatus === "Da revisionare" && (goodAdherence || solidProgress || !lowAdherence)) {
    summaryStatus = "Pronto per revisione";
  } else if (persistentHighFatigue || possibleDeloadNeed) {
    summaryStatus = "Fatica elevata";
  } else if (lowAdherence || tooManySkipped || missedSessions > 0) {
    summaryStatus = "Percorso incompleto";
  } else if (diffuseStagnation) {
    summaryStatus = "Progressi limitati";
  }

  let recommendation: BlockReviewRecommendation = "Continua con il programma attuale";

  if (onboardingChanged && blockStatus === "Da revisionare") {
    recommendation = "Aggiorna obiettivo e risposte iniziali prima della prossima fase";
  } else if (insufficientDataSignal && plannedSessionsToDate > completedSessions) {
    recommendation = "Completa prima le sedute mancanti";
  } else if (persistentHighFatigue || possibleDeloadNeed) {
    recommendation = "Valuta una settimana piu leggera";
  } else if (blockStatus === "Da revisionare" && lowAdherence) {
    recommendation = "Riparti da questa fase con piu continuita";
  } else if (diffuseStagnation) {
    recommendation = "Mantieni i carichi e consolida";
  } else if (blockStatus === "Da revisionare" && !lowAdherence && !persistentHighFatigue) {
    recommendation = "Puoi preparare la fase successiva";
  } else if (missedSessions > 0 || skippedSessions > 0) {
    recommendation = "Completa prima le sedute mancanti";
  }

  const keyMetrics: BlockReviewMetric[] = [
    {
      label: "Sedute completate",
      value: `${completedSessions}/${plannedSessionsToDate || 0}`,
      hint: `${skippedSessions} saltate, ${missedSessions} mancate o da recuperare.`,
    },
    {
      label: "Aderenza",
      value: adherencePercentage !== null ? `${adherencePercentage}%` : "n/d",
      hint: "Calcolata sulle sedute previste fino a oggi.",
    },
    {
      label: "Fatica percepita",
      value: averagePerceivedEffort !== null ? `${averagePerceivedEffort}/10` : "n/d",
      hint: "Media sulle sedute completate in questa fase del programma.",
    },
    {
      label: "Progressione esercizi",
      value: `${positiveProgressExercises} positivi`,
      hint: `${stagnantExercises} stagnanti, ${insufficientExerciseData} con dati insufficienti.`,
    },
    {
      label: "RIR molto basso",
      value: veryLowRirFrequency !== null ? `${Math.round(veryLowRirFrequency * 100)}%` : "n/d",
      hint: "Frequenza di serie con RIR 1 o inferiore.",
    },
    {
      label: "Qualita dati",
      value: dataQualityLabel,
      hint: `${incompleteSets} serie non completate, ${swappedExercises} sostituzioni esercizi.`,
    },
  ];

  const adherenceSummary = `${completedSessions} sedute completate su ${plannedSessionsToDate} previste fino a oggi. ${skippedSessions} risultano saltate e ${missedSessions} non risultano ancora chiuse.`;
  const progressSummary =
    positiveProgressExercises > 0
      ? `${positiveProgressExercises} esercizi mostrano segnali positivi nell'intera fase del programma.`
      : trackedExercises > 0
        ? "Non emergono ancora progressi solidi abbastanza diffusi per forzare il prossimo passo."
        : "Mancano riferimenti utili per interpretare l'andamento degli esercizi.";
  const criticalitySummary =
    signals.includes("dati insufficienti")
      ? "La lettura del programma resta parziale: i dati disponibili non bastano per una revisione affidabile."
      : signals.includes("possibile necessita di scarico")
        ? "L'accumulo di fatica richiede prudenza prima di spingere ulteriormente."
        : signals.includes("troppe sedute saltate")
          ? "La continuita del programma e il primo punto da sistemare prima di cambiare struttura."
          : "Il programma puo essere letto con sufficiente chiarezza sui dati attuali.";

  return {
    activeProgram: {
      id: activeProgram.id,
      title: activeProgram.title,
    },
    block: {
      currentWeek,
      durationWeeks,
      startedAt,
      plannedReviewAt,
      status: blockStatus,
    },
    summaryStatus,
    recommendation,
    metrics: {
      plannedSessionsToDate,
      completedSessions,
      skippedSessions,
      missedSessions,
      adherencePercentage,
      averagePerceivedEffort,
      positiveProgressExercises,
      stagnantExercises,
      insufficientExerciseData,
      veryLowRirFrequency,
      incompleteSets,
      swappedExercises,
      dataQualityScore,
      dataQualityLabel,
    },
    keyMetrics,
    signals,
    summaries: {
      adherence: adherenceSummary,
      progress: progressSummary,
      criticality: criticalitySummary,
    },
    cautions,
    disclaimer: "Questa revisione non modifica automaticamente il programma.",
  };
}
