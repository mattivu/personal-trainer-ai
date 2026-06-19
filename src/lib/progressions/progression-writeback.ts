import { prisma } from "@/lib/prisma";
import {
  calculateSetPerformance,
  parseRepTarget,
  type PreviousExerciseSetPerformance,
} from "@/lib/progression-engine";

const PROGRESSION_PREFIX = "Progressione:";
const PAIN_OR_DISCOMFORT_PATTERN =
  /(dolor|male|fastid|infortun|stirament|pain|discomfort|limita|limitaz|vertigin|capogir|nausea)/i;
const HIGH_FATIGUE_PATTERN =
  /(fatica eccessiva|sfiniment|esaust|stanch|spomp|troppo pesante|scarico urgente)/i;
const ADVANCED_TECHNIQUE_PATTERN =
  /(tecnica:|drop set|rest-pause|rest pause|myo reps|cluster|superset|tempo controllato|back-off|back off)/i;

type CompletedExerciseSet = PreviousExerciseSetPerformance & {
  rpe: number | null;
  notes: string | null;
};

type ProgressionExerciseRecord = {
  id: number;
  workoutId: number;
  workoutSortOrder: number;
  exerciseId: number | null;
  name: string;
  sortOrder: number;
  sets: number | null;
  reps: string | null;
  intensity: string | null;
  notes: string | null;
  isActive: boolean;
  replacedAt: Date | null;
  replacedByProgramExerciseId: number | null;
  replacementReason: string | null;
  exercise: {
    category: string | null;
    movementPattern: string | null;
    tags: unknown;
    difficulty: string | null;
    primaryMuscle: string | null;
  } | null;
};

type CompletedExerciseForWriteBack = ProgressionExerciseRecord & {
  performedSets: CompletedExerciseSet[];
};

type NextProgramExerciseForWriteBack = ProgressionExerciseRecord;

type ProgressionWriteBackContext = {
  userExperience: string | null;
  perceivedEffort: number | null;
  workoutNotes: string | null;
  completedWorkoutTitle: string | null;
  nextWorkoutTitle: string | null;
};

export type ProgressionUpdate = {
  reps: string | null;
  intensity: string | null;
  notes: string | null;
  action:
    | "skip"
    | "increase_reps"
    | "increase_load"
    | "maintain"
    | "repeat"
    | "reduce";
};

export type ProgressionWriteBackResult = {
  workoutLogId: number;
  consideredExercises: number;
  updatedExercises: number;
  skippedExercises: number;
  updates: Array<{
    sourceProgramExerciseId: number;
    targetProgramExerciseId: number;
    action: ProgressionUpdate["action"];
  }>;
};

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function buildExerciseMatchKey(exercise: {
  exerciseId: number | null;
  name: string;
}) {
  if (exercise.exerciseId !== null) {
    return `exercise:${exercise.exerciseId}`;
  }

  return `name:${normalizeText(exercise.name)}`;
}

function extractBaseReps(notes: string | null) {
  if (!notes) {
    return null;
  }

  const match = notes.match(/Progressione:\s*base\s+([^,.]+(?:-[^,.]+)?)/i);
  return match?.[1]?.trim() ?? null;
}

function replaceProgressionLine(existingNotes: string | null, progressionLine: string | null) {
  const lines = (existingNotes ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.trimStart().startsWith(PROGRESSION_PREFIX));

  if (progressionLine) {
    lines.push(progressionLine);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

function formatRepTarget(min: number, max: number) {
  return min === max ? `${min}` : `${min}-${max}`;
}

function increaseRepTarget(baseReps: string | null, step: number) {
  const parsed = parseRepTarget(baseReps);

  if (parsed.kind !== "reps") {
    return baseReps;
  }

  if (parsed.min === parsed.max) {
    return `${parsed.min + step}`;
  }

  return formatRepTarget(Math.min(parsed.min + step, parsed.max), parsed.max);
}

function reduceRepTarget(baseReps: string | null, step: number) {
  const parsed = parseRepTarget(baseReps);

  if (parsed.kind !== "reps") {
    return baseReps;
  }

  if (parsed.min === parsed.max) {
    return `${Math.max(1, parsed.min - step)}`;
  }

  const nextMin = Math.max(1, parsed.min - step);
  const nextMax = Math.max(nextMin, parsed.max - step);
  return formatRepTarget(nextMin, nextMax);
}

function buildLoadProgressionRepTarget(baseReps: string | null) {
  const parsed = parseRepTarget(baseReps);

  if (parsed.kind !== "reps") {
    return baseReps;
  }

  if (parsed.min === parsed.max) {
    return `${parsed.min}`;
  }

  const range = parsed.max - parsed.min;
  const nextMax = Math.max(parsed.min, parsed.min + Math.max(0, Math.floor(range / 2)));
  return formatRepTarget(parsed.min, nextMax);
}

function getAverageRpe(sets: CompletedExerciseSet[]) {
  const rpeValues = sets
    .map((set) => set.rpe)
    .filter((value): value is number => value !== null);

  if (rpeValues.length === 0) {
    return null;
  }

  return rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length;
}

function hasMeaningfulExerciseData(sets: CompletedExerciseSet[]) {
  return sets.some(
    (set) =>
      set.completed ||
      set.actualReps !== null ||
      set.weightKg !== null ||
      set.rir !== null ||
      set.rpe !== null ||
      Boolean(set.notes?.trim())
  );
}

function classifyExercise(exercise: ProgressionExerciseRecord) {
  const category = normalizeText(exercise.exercise?.category);
  const movementPattern = normalizeText(exercise.exercise?.movementPattern);
  const tags = normalizeStringArray(exercise.exercise?.tags).map(normalizeText);
  const combined = [category, movementPattern, ...tags, normalizeText(exercise.name)].join(" ");

  const isCardio =
    category === "cardio" ||
    movementPattern.includes("cardio") ||
    tags.includes("cardio") ||
    combined.includes("conditioning");
  const isMobility =
    category === "mobility" ||
    category === "prehab" ||
    movementPattern.includes("mobility") ||
    tags.includes("mobility") ||
    tags.includes("prehab");
  const isIsolation = tags.includes("isolation");
  const isCompound =
    tags.includes("compound") ||
    ["squat", "hinge", "horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"].some(
      (pattern) => movementPattern.includes(pattern)
    );
  const parsedReps = parseRepTarget(exercise.reps);
  const isMainCompound =
    isCompound &&
    parsedReps.kind === "reps" &&
    parsedReps.max <= 8;
  const hasAdvancedTechnique = ADVANCED_TECHNIQUE_PATTERN.test(
    `${exercise.notes ?? ""} ${exercise.intensity ?? ""}`
  );

  return {
    isCardio,
    isMobility,
    isIsolation,
    isCompound,
    isMainCompound,
    hasAdvancedTechnique,
  };
}

function buildProgressionLine(baseReps: string | null, message: string) {
  if (!baseReps) {
    return `${PROGRESSION_PREFIX} ${message}`;
  }

  return `${PROGRESSION_PREFIX} base ${baseReps}, ${message}`;
}

function isExerciseSkipped(sets: CompletedExerciseSet[]) {
  return !hasMeaningfulExerciseData(sets);
}

function getRepStep(exercise: ProgressionExerciseRecord, experience: string | null) {
  const normalizedExperience = normalizeText(experience);
  const { isIsolation } = classifyExercise(exercise);

  if (normalizedExperience === "advanced") {
    return 1;
  }

  return isIsolation ? 2 : 1;
}

export function buildProgressionUpdateFromCompletedExercise(
  completedExercise: CompletedExerciseForWriteBack,
  nextExercise: NextProgramExerciseForWriteBack,
  context: ProgressionWriteBackContext
): ProgressionUpdate {
  const completedClassification = classifyExercise(completedExercise);
  const nextClassification = classifyExercise(nextExercise);

  if (
    completedClassification.isCardio ||
    completedClassification.isMobility ||
    nextClassification.isCardio ||
    nextClassification.isMobility
  ) {
    return {
      action: "skip",
      reps: nextExercise.reps,
      intensity: nextExercise.intensity,
      notes: nextExercise.notes,
    };
  }

  if (
    !nextExercise.isActive ||
    nextExercise.replacedAt !== null ||
    nextExercise.replacedByProgramExerciseId !== null ||
    Boolean(nextExercise.replacementReason)
  ) {
    return {
      action: "skip",
      reps: nextExercise.reps,
      intensity: nextExercise.intensity,
      notes: nextExercise.notes,
    };
  }

  if (isExerciseSkipped(completedExercise.performedSets)) {
    return {
      action: "skip",
      reps: nextExercise.reps,
      intensity: nextExercise.intensity,
      notes: nextExercise.notes,
    };
  }

  const performanceTarget = parseRepTarget(completedExercise.reps);
  const performanceSummary = calculateSetPerformance(
    performanceTarget,
    completedExercise.performedSets,
    completedExercise.sets
  );
  const averageRpe = getAverageRpe(completedExercise.performedSets);
  const baseReps = extractBaseReps(nextExercise.notes) ?? nextExercise.reps;
  const baseNotes = replaceProgressionLine(nextExercise.notes, null);
  const combinedNotes = [
    completedExercise.notes,
    context.workoutNotes,
    ...completedExercise.performedSets.map((set) => set.notes),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  const painSignal = PAIN_OR_DISCOMFORT_PATTERN.test(combinedNotes);
  const fatigueSignal =
    HIGH_FATIGUE_PATTERN.test(combinedNotes) || (context.perceivedEffort ?? 0) >= 9;
  const almostAllSetsCompleted =
    performanceSummary.analyzedSets > 0 &&
    performanceSummary.completedSets >= Math.max(1, performanceSummary.analyzedSets - 1);
  const repsMostlyOnTarget =
    performanceTarget.kind === "reps"
      ? performanceSummary.repsInRangeSets >= Math.max(1, performanceSummary.analyzedSets - 1)
      : performanceSummary.allCompleted;
  const repsMostlyHigh =
    performanceTarget.kind === "reps"
      ? performanceSummary.repsAtOrAboveHighSets >=
        Math.max(1, performanceSummary.analyzedSets - 1)
      : false;
  const manyRepsBelowTarget =
    performanceTarget.kind === "reps" &&
    performanceSummary.repsBelowLowSets >= Math.max(1, Math.ceil(performanceSummary.analyzedSets / 2));
  const lowRir = performanceSummary.averageRir !== null && performanceSummary.averageRir <= 1;
  const solidRir = performanceSummary.averageRir !== null && performanceSummary.averageRir >= 2;
  const highRpe = averageRpe !== null && averageRpe >= 9;
  const moderateRir =
    performanceSummary.averageRir !== null &&
    performanceSummary.averageRir >= 1 &&
    performanceSummary.averageRir < 2;
  const repStep = getRepStep(nextExercise, context.userExperience);

  if (painSignal || fatigueSignal) {
    const progressionLine = buildProgressionLine(
      baseReps,
      "mantieni prudenza e riduci leggermente solo se senti ancora fastidio."
    );

    return {
      action: "maintain",
      reps: baseReps,
      intensity: nextExercise.intensity,
      notes: replaceProgressionLine(baseNotes, progressionLine),
    };
  }

  if (
    completedClassification.hasAdvancedTechnique ||
    nextClassification.hasAdvancedTechnique ||
    (completedClassification.isMainCompound && !solidRir)
  ) {
    const progressionLine = buildProgressionLine(
      baseReps,
      "consolida il target prima di aumentare."
    );

    return {
      action: "repeat",
      reps: baseReps,
      intensity: nextExercise.intensity,
      notes: replaceProgressionLine(baseNotes, progressionLine),
    };
  }

  if (!almostAllSetsCompleted || manyRepsBelowTarget) {
    const reducedReps = reduceRepTarget(baseReps, 1);
    const changedReps = reducedReps !== baseReps;
    const progressionLine = buildProgressionLine(
      baseReps,
      changedReps
        ? `obiettivo ${reducedReps}, poi ricostruisci con tecnica pulita.`
        : "ripeti il target con controllo prima di aumentare."
    );

    return {
      action: changedReps ? "reduce" : "repeat",
      reps: reducedReps,
      intensity: nextExercise.intensity,
      notes: replaceProgressionLine(baseNotes, progressionLine),
    };
  }

  if (repsMostlyOnTarget && (lowRir || highRpe)) {
    const progressionLine = buildProgressionLine(
      baseReps,
      "mantieni il carico e ripeti il target con margine migliore."
    );

    return {
      action: "repeat",
      reps: baseReps,
      intensity: nextExercise.intensity,
      notes: replaceProgressionLine(baseNotes, progressionLine),
    };
  }

  if (repsMostlyHigh && solidRir) {
    const loadProgressionReps = buildLoadProgressionRepTarget(baseReps);
    const progressionLine = buildProgressionLine(
      baseReps,
      `prova ad aumentare leggermente il carico restando su ${loadProgressionReps}.`
    );

    return {
      action: "increase_load",
      reps: loadProgressionReps,
      intensity: nextExercise.intensity,
      notes: replaceProgressionLine(baseNotes, progressionLine),
    };
  }

  if (repsMostlyOnTarget && (solidRir || moderateRir || averageRpe === null || averageRpe <= 8)) {
    const increasedReps = increaseRepTarget(baseReps, repStep);
    const changedReps = increasedReps !== baseReps;
    const progressionLine = buildProgressionLine(
      baseReps,
      changedReps
        ? `obiettivo ${increasedReps} mantenendo tecnica pulita.`
        : "mantieni il target e prova un piccolo progresso pulito."
    );

    return {
      action: changedReps ? "increase_reps" : "maintain",
      reps: increasedReps,
      intensity: nextExercise.intensity,
      notes: replaceProgressionLine(baseNotes, progressionLine),
    };
  }

  const fallbackLine = buildProgressionLine(
    baseReps,
    "mantieni il target e consolida l'esecuzione."
  );

  return {
    action: "maintain",
    reps: baseReps,
    intensity: nextExercise.intensity,
    notes: replaceProgressionLine(baseNotes, fallbackLine),
  };
}

async function getOrderedProgramExercises(programId: number) {
  const program = await prisma.trainingProgram.findUnique({
    where: {
      id: programId,
    },
    select: {
      workouts: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          sortOrder: true,
          exercises: {
            where: {
              isActive: true,
            },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: {
              id: true,
              workoutId: true,
              exerciseId: true,
              name: true,
              sortOrder: true,
              sets: true,
              reps: true,
              intensity: true,
              notes: true,
              isActive: true,
              replacedAt: true,
              replacedByProgramExerciseId: true,
              replacementReason: true,
              exercise: {
                select: {
                  category: true,
                  movementPattern: true,
                  tags: true,
                  difficulty: true,
                  primaryMuscle: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!program) {
    return [];
  }

  return program.workouts.flatMap((workout) =>
    workout.exercises.map((exercise) => ({
      ...exercise,
      workoutSortOrder: workout.sortOrder,
    }))
  );
}

export async function getNextProgramExercisesForProgression(
  programId: number,
  completedWorkoutId: number
) {
  const orderedExercises = await getOrderedProgramExercises(programId);
  const completedWorkoutExercises = orderedExercises.filter(
    (exercise) => exercise.workoutId === completedWorkoutId
  );
  const reservedTargetIds = new Set<number>();
  const matches = new Map<number, NextProgramExerciseForWriteBack | null>();

  for (const exercise of completedWorkoutExercises) {
    const exerciseKey = buildExerciseMatchKey(exercise);
    const currentIndex = orderedExercises.findIndex((candidate) => candidate.id === exercise.id);

    if (currentIndex === -1) {
      matches.set(exercise.id, null);
      continue;
    }

    let nextMatch: NextProgramExerciseForWriteBack | null = null;

    for (let offset = 1; offset < orderedExercises.length; offset += 1) {
      const candidate = orderedExercises[(currentIndex + offset) % orderedExercises.length];

      if (candidate.id === exercise.id || reservedTargetIds.has(candidate.id)) {
        continue;
      }

      if (buildExerciseMatchKey(candidate) !== exerciseKey) {
        continue;
      }

      nextMatch = candidate;
      reservedTargetIds.add(candidate.id);
      break;
    }

    matches.set(exercise.id, nextMatch);
  }

  return matches;
}

export async function applyProgressionWriteBackAfterWorkout(input: {
  workoutLogId: number;
  userId: number;
}): Promise<ProgressionWriteBackResult> {
  const completedWorkoutLog = await prisma.workoutLog.findFirst({
    where: {
      id: input.workoutLogId,
      userId: input.userId,
      status: "completed",
      programId: {
        not: null,
      },
      workoutId: {
        not: null,
      },
      program: {
        userId: input.userId,
        status: "active",
      },
    },
    select: {
      id: true,
      workoutId: true,
      programId: true,
      perceivedEffort: true,
      notes: true,
      user: {
        select: {
          profile: {
            select: {
              experience: true,
            },
          },
        },
      },
      workout: {
        select: {
          title: true,
        },
      },
      setLogs: {
        where: {
          programExerciseId: {
            not: null,
          },
        },
        orderBy: [{ setNumber: "asc" }, { id: "asc" }],
        select: {
          programExerciseId: true,
          setNumber: true,
          actualReps: true,
          weightKg: true,
          rir: true,
          rpe: true,
          completed: true,
          notes: true,
          programExercise: {
            select: {
              id: true,
              workoutId: true,
              exerciseId: true,
              name: true,
              sortOrder: true,
              sets: true,
              reps: true,
              intensity: true,
              notes: true,
              isActive: true,
              replacedAt: true,
              replacedByProgramExerciseId: true,
              replacementReason: true,
              workout: {
                select: {
                  sortOrder: true,
                },
              },
              exercise: {
                select: {
                  category: true,
                  movementPattern: true,
                  tags: true,
                  difficulty: true,
                  primaryMuscle: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!completedWorkoutLog || completedWorkoutLog.programId === null || completedWorkoutLog.workoutId === null) {
    return {
      workoutLogId: input.workoutLogId,
      consideredExercises: 0,
      updatedExercises: 0,
      skippedExercises: 0,
      updates: [],
    };
  }

  const nextExercisesByCompletedExercise = await getNextProgramExercisesForProgression(
    completedWorkoutLog.programId,
    completedWorkoutLog.workoutId
  );
  const groupedSetLogs = new Map<number, (typeof completedWorkoutLog.setLogs)[number][]>();

  for (const setLog of completedWorkoutLog.setLogs) {
    if (setLog.programExerciseId === null) {
      continue;
    }

    const group = groupedSetLogs.get(setLog.programExerciseId) ?? [];
    group.push(setLog);
    groupedSetLogs.set(setLog.programExerciseId, group);
  }

  const updates: ProgressionWriteBackResult["updates"] = [];
  let updatedExercises = 0;
  let skippedExercises = 0;

  for (const [programExerciseId, setLogs] of groupedSetLogs.entries()) {
    const sourceProgramExercise = setLogs[0]?.programExercise;
    const nextProgramExercise = nextExercisesByCompletedExercise.get(programExerciseId) ?? null;

    if (!sourceProgramExercise || !nextProgramExercise) {
      skippedExercises += 1;
      continue;
    }

    const completedExercise: CompletedExerciseForWriteBack = {
      id: sourceProgramExercise.id,
      workoutId: sourceProgramExercise.workoutId,
      workoutSortOrder: sourceProgramExercise.workout.sortOrder,
      exerciseId: sourceProgramExercise.exerciseId,
      name: sourceProgramExercise.name,
      sortOrder: sourceProgramExercise.sortOrder,
      sets: sourceProgramExercise.sets,
      reps: sourceProgramExercise.reps,
      intensity: sourceProgramExercise.intensity,
      notes: sourceProgramExercise.notes,
      isActive: sourceProgramExercise.isActive,
      replacedAt: sourceProgramExercise.replacedAt,
      replacedByProgramExerciseId: sourceProgramExercise.replacedByProgramExerciseId,
      replacementReason: sourceProgramExercise.replacementReason,
      exercise: sourceProgramExercise.exercise,
      performedSets: setLogs.map((setLog) => ({
        setNumber: setLog.setNumber,
        weightKg: setLog.weightKg,
        actualReps: setLog.actualReps,
        rir: setLog.rir,
        completed: setLog.completed,
        rpe: setLog.rpe,
        notes: setLog.notes,
      })),
    };

    const update = buildProgressionUpdateFromCompletedExercise(completedExercise, nextProgramExercise, {
      userExperience: completedWorkoutLog.user.profile?.experience ?? null,
      perceivedEffort: completedWorkoutLog.perceivedEffort,
      workoutNotes: completedWorkoutLog.notes,
      completedWorkoutTitle: completedWorkoutLog.workout?.title ?? null,
      nextWorkoutTitle: null,
    });

    if (update.action === "skip") {
      skippedExercises += 1;
      continue;
    }

    const hasChanges =
      update.reps !== nextProgramExercise.reps ||
      update.intensity !== nextProgramExercise.intensity ||
      update.notes !== nextProgramExercise.notes;

    if (!hasChanges) {
      skippedExercises += 1;
      continue;
    }

    await prisma.programExercise.update({
      where: {
        id: nextProgramExercise.id,
      },
      data: {
        reps: update.reps,
        intensity: update.intensity,
        notes: update.notes,
      },
    });

    updatedExercises += 1;
    updates.push({
      sourceProgramExerciseId: programExerciseId,
      targetProgramExerciseId: nextProgramExercise.id,
      action: update.action,
    });
  }

  return {
    workoutLogId: input.workoutLogId,
    consideredExercises: groupedSetLogs.size,
    updatedExercises,
    skippedExercises,
    updates,
  };
}
