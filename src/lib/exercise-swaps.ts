import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds } from "@/lib/workout-execution";
import { buildNormalizedOnboardingProfile } from "@/lib/training-engine/onboarding-profile";
import type {
  EngineExercise,
  NormalizedTrainingProfile,
} from "@/lib/training-engine/types";

export const EXERCISE_SWAP_REASONS = [
  "machine_busy",
  "no_equipment",
  "discomfort_or_limitation",
  "too_difficult",
  "prefer_alternative",
] as const;

export type ExerciseSwapReason = (typeof EXERCISE_SWAP_REASONS)[number];

type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

type SwapExercise = EngineExercise & {
  id: number;
  name: string;
  slug: string;
};

type AuthorizedProgramExercise = {
  id: number;
  exerciseId: number | null;
  name: string;
  sortOrder: number;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  tempo: string | null;
  intensity: string | null;
  notes: string | null;
  alternatives: Prisma.JsonValue | null;
  isActive: boolean;
  workout: {
    id: number;
    title: string;
    program: {
      id: number;
      status: string;
      userId: number;
    };
    exercises: Array<{
      id: number;
      exerciseId: number | null;
    }>;
  };
  exercise: SwapExercise | null;
};

export type ExerciseAlternative = {
  exerciseId: number;
  name: string;
  primaryMuscle: string | null;
  equipment: string | null;
  difficulty: string | null;
  movementPattern: string | null;
  score: number;
  matchReasons: string[];
};

type AlternativesResult = {
  programExercise: AuthorizedProgramExercise;
  workoutCompletedThisWeek: boolean;
  alternatives: ExerciseAlternative[];
};

type SwapHistoryEntry = {
  swappedAt: string;
  reason: ExerciseSwapReason;
  oldExerciseId: number | null;
  newExerciseId: number;
  oldExerciseName: string;
  newExerciseName: string;
};

type SwapMetadata = {
  slugCandidates?: string[];
  candidateExerciseIds?: number[];
  swapHistory?: SwapHistoryEntry[];
};

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map(normalizeText)
        .filter(Boolean)
    : [];
}

function normalizeDifficulty(
  value: string | null | undefined
): ExerciseDifficulty {
  const normalized = normalizeText(value);

  if (normalized === "advanced" || normalized === "intermediate") {
    return normalized;
  }

  return "beginner";
}

function getDifficultyRank(value: ExerciseDifficulty) {
  switch (value) {
    case "beginner":
      return 1;
    case "intermediate":
      return 2;
    case "advanced":
      return 3;
    default:
      return 1;
  }
}

function hasAny(source: string[], expected: string[]) {
  return expected.some((item) => source.includes(normalizeText(item)));
}

function getAllowedEnvironments(profile: NormalizedTrainingProfile) {
  switch (profile.environment) {
    case "mixed":
      return ["gym", "home", "outdoor"];
    case "unknown":
      return ["gym", "home"];
    default:
      return [profile.environment];
  }
}

function matchesEnvironment(
  exercise: SwapExercise,
  profile: NormalizedTrainingProfile
) {
  const environments = normalizeStringArray(exercise.environments);
  const allowedEnvironments = getAllowedEnvironments(profile);
  const normalizedEnvironments = environments.length > 0 ? environments : ["gym"];

  return hasAny(normalizedEnvironments, allowedEnvironments);
}

function getPreferredEquipment(profile: NormalizedTrainingProfile) {
  const mapped = new Set<string>();

  for (const item of profile.equipmentPreference.map(normalizeText)) {
    if (item === "machines") {
      mapped.add("macchina");
      mapped.add("machine");
    }

    if (item === "cables") {
      mapped.add("cavi");
      mapped.add("cable");
    }

    if (item === "dumbbells") {
      mapped.add("manubri");
      mapped.add("dumbbell");
    }

    if (item === "barbell") {
      mapped.add("bilanciere");
      mapped.add("barbell");
    }

    if (item === "bands") {
      mapped.add("elastico");
      mapped.add("band");
    }

    if (item === "bodyweight") {
      mapped.add("corpo libero");
      mapped.add("bodyweight");
    }
  }

  if (profile.environment === "gym") {
    mapped.add("machine");
    mapped.add("macchina");
    mapped.add("cable");
    mapped.add("cavi");
  }

  if (profile.environment === "home") {
    mapped.add("bodyweight");
    mapped.add("corpo libero");
  }

  return mapped;
}

function matchesEquipment(
  exercise: SwapExercise,
  profile: NormalizedTrainingProfile
) {
  const normalizedEquipment = normalizeText(exercise.equipment);
  const tags = normalizeStringArray(exercise.tags);
  const preferredEquipment = getPreferredEquipment(profile);

  if (!normalizedEquipment) {
    return true;
  }

  if (preferredEquipment.has(normalizedEquipment) || hasAny(tags, [...preferredEquipment])) {
    return true;
  }

  if (profile.environment === "gym" || profile.environment === "mixed") {
    return true;
  }

  if (profile.environment === "unknown") {
    return true;
  }

  return false;
}

function isContraindicatedForProfile(
  exercise: SwapExercise,
  profile: NormalizedTrainingProfile
) {
  const contraindications = normalizeStringArray(exercise.contraindications);
  const tags = normalizeStringArray(exercise.tags);
  const movementPattern = normalizeText(exercise.movementPattern);

  if (profile.limitations.includes("knee")) {
    if (
      contraindications.includes("knee") ||
      tags.includes("knee_caution") ||
      tags.includes("high_impact") ||
      movementPattern === "lunge"
    ) {
      return true;
    }
  }

  if (profile.limitations.includes("no_jump") && tags.includes("high_impact")) {
    return true;
  }

  if (profile.limitations.includes("shoulder")) {
    if (
      contraindications.includes("shoulder") ||
      tags.includes("shoulder_caution") ||
      movementPattern === "vertical_push"
    ) {
      return true;
    }
  }

  if (profile.limitations.includes("back")) {
    if (
      contraindications.includes("back") ||
      tags.includes("back_caution") ||
      movementPattern === "hinge"
    ) {
      return true;
    }
  }

  return false;
}

function getMuscleFamily(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (["petto"].includes(normalized)) {
    return "chest";
  }

  if (["dorsali", "schiena", "gran dorsale"].includes(normalized)) {
    return "back";
  }

  if (
    ["spalle", "deltoidi posteriori", "deltoidi laterali", "deltoidi"].includes(
      normalized
    )
  ) {
    return "shoulders";
  }

  if (["tricipiti"].includes(normalized)) {
    return "triceps";
  }

  if (["bicipiti"].includes(normalized)) {
    return "biceps";
  }

  if (["quadricipiti"].includes(normalized)) {
    return "quads";
  }

  if (["femorali"].includes(normalized)) {
    return "hamstrings";
  }

  if (["glutei"].includes(normalized)) {
    return "glutes";
  }

  if (["polpacci"].includes(normalized)) {
    return "calves";
  }

  if (["core", "addome", "addominali"].includes(normalized)) {
    return "core";
  }

  return normalized || "other";
}

function matchesPrimaryMuscle(current: SwapExercise, candidate: SwapExercise) {
  const currentMuscle = normalizeText(current.primaryMuscle);
  const candidateMuscle = normalizeText(candidate.primaryMuscle);

  if (currentMuscle && currentMuscle === candidateMuscle) {
    return true;
  }

  return getMuscleFamily(current.primaryMuscle) === getMuscleFamily(candidate.primaryMuscle);
}

function collectMatchReasons(
  current: SwapExercise,
  candidate: SwapExercise,
  explicitAlternative: boolean
) {
  const reasons: string[] = [];

  if (explicitAlternative) {
    reasons.push("Alternativa gia prevista");
  }

  if (normalizeText(current.primaryMuscle) === normalizeText(candidate.primaryMuscle)) {
    reasons.push("Stesso muscolo principale");
  } else if (matchesPrimaryMuscle(current, candidate)) {
    reasons.push("Gruppo muscolare compatibile");
  }

  if (
    normalizeText(current.movementPattern) &&
    normalizeText(current.movementPattern) === normalizeText(candidate.movementPattern)
  ) {
    reasons.push("Pattern di movimento coerente");
  }

  if (
    normalizeText(current.equipment) &&
    normalizeText(current.equipment) === normalizeText(candidate.equipment)
  ) {
    reasons.push("Attrezzatura simile");
  }

  return reasons;
}

async function getNormalizedProfileForUser(userId: number) {
  const onboardingAnswers = await prisma.onboardingAnswer.findMany({
    where: {
      userId,
    },
    select: {
      answersJson: true,
    },
  });

  return buildNormalizedOnboardingProfile(
    onboardingAnswers.map((answer) => answer.answersJson)
  ).profile;
}

export async function getAuthorizedProgramExerciseForUser(
  userId: number,
  programExerciseId: number
) {
  const programExercise = await prisma.programExercise.findFirst({
    where: {
      id: programExerciseId,
      isActive: true,
      workout: {
        program: {
          userId,
        },
      },
    },
    include: {
      exercise: true,
      workout: {
        include: {
          program: {
            select: {
              id: true,
              status: true,
              userId: true,
            },
          },
          exercises: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              exerciseId: true,
            },
          },
        },
      },
    },
  });

  return programExercise as AuthorizedProgramExercise | null;
}

export async function isWorkoutCompletedThisWeekForUser(
  userId: number,
  workoutId: number
) {
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
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      status: true,
    },
  });

  return currentWeekLog?.status === "completed";
}

export function parseExerciseSwapReason(value: unknown) {
  if (
    typeof value === "string" &&
    EXERCISE_SWAP_REASONS.includes(value as ExerciseSwapReason)
  ) {
    return value as ExerciseSwapReason;
  }

  return null;
}

export async function getExerciseAlternativesForUser(
  userId: number,
  programExerciseId: number,
  reason: ExerciseSwapReason
): Promise<AlternativesResult | null> {
  const programExercise = await getAuthorizedProgramExerciseForUser(
    userId,
    programExerciseId
  );

  if (!programExercise?.exercise) {
    return null;
  }

  const [profile, workoutCompletedThisWeek, allExercises] = await Promise.all([
    getNormalizedProfileForUser(userId),
    isWorkoutCompletedThisWeekForUser(userId, programExercise.workout.id),
    prisma.exercise.findMany(),
  ]);

  const currentExercise = programExercise.exercise;
  const currentDifficultyRank = getDifficultyRank(
    normalizeDifficulty(currentExercise.difficulty)
  );
  const allowedDifficultyRank = getDifficultyRank(profile.experience);
  const explicitAlternativeSlugs = new Set(
    normalizeStringArray(currentExercise.alternatives)
  );
  const excludedExerciseIds = new Set(
    programExercise.workout.exercises
      .filter((exercise) => exercise.id !== programExercise.id)
      .map((exercise) => exercise.exerciseId)
      .filter((exerciseId): exerciseId is number => exerciseId !== null)
  );

  const alternatives = allExercises
    .filter((candidate) => candidate.id !== currentExercise.id)
    .filter((candidate) => !excludedExerciseIds.has(candidate.id))
    .filter((candidate) => matchesEnvironment(candidate as SwapExercise, profile))
    .filter((candidate) => matchesEquipment(candidate as SwapExercise, profile))
    .filter((candidate) => !isContraindicatedForProfile(candidate as SwapExercise, profile))
    .filter(
      (candidate) =>
        getDifficultyRank(normalizeDifficulty(candidate.difficulty)) <=
        allowedDifficultyRank
    )
    .map((candidate) => {
      const swapCandidate = candidate as SwapExercise;
      const explicitAlternative =
        explicitAlternativeSlugs.has(normalizeText(candidate.slug)) ||
        normalizeStringArray(candidate.alternatives).includes(
          normalizeText(currentExercise.slug)
        );
      const samePrimaryMuscle =
        normalizeText(currentExercise.primaryMuscle) ===
        normalizeText(candidate.primaryMuscle);
      const compatiblePrimaryMuscle = matchesPrimaryMuscle(
        currentExercise,
        swapCandidate
      );
      const sameMovementPattern =
        normalizeText(currentExercise.movementPattern) !== "" &&
        normalizeText(currentExercise.movementPattern) ===
          normalizeText(candidate.movementPattern);
      const sameEquipment =
        normalizeText(currentExercise.equipment) !== "" &&
        normalizeText(currentExercise.equipment) ===
          normalizeText(candidate.equipment);
      const candidateDifficultyRank = getDifficultyRank(
        normalizeDifficulty(candidate.difficulty)
      );

      let score = 0;

      if (explicitAlternative) {
        score += 50;
      }

      if (samePrimaryMuscle) {
        score += 38;
      } else if (compatiblePrimaryMuscle) {
        score += 24;
      } else {
        score -= 18;
      }

      if (sameMovementPattern) {
        score += 28;
      } else if (candidate.movementPattern) {
        score -= 10;
      }

      if (sameEquipment) {
        score += 8;
      }

      if (reason === "machine_busy" || reason === "no_equipment") {
        if (sameEquipment) {
          score -= 20;
        }

        if (
          hasAny(normalizeStringArray(candidate.tags), [
            "bodyweight",
            "dumbbell",
            "band",
            "cable",
          ])
        ) {
          score += 8;
        }
      }

      if (reason === "too_difficult") {
        if (candidateDifficultyRank < currentDifficultyRank) {
          score += 16;
        } else if (candidateDifficultyRank > currentDifficultyRank) {
          score -= 24;
        }
      }

      if (reason === "discomfort_or_limitation") {
        if (
          hasAny(normalizeStringArray(candidate.tags), [
            "low_impact",
            "beginner_friendly",
            "shoulder_friendly",
          ])
        ) {
          score += 14;
        }
      }

      if (reason === "prefer_alternative" && explicitAlternative) {
        score += 12;
      }

      return {
        exerciseId: candidate.id,
        name: candidate.name,
        primaryMuscle: candidate.primaryMuscle,
        equipment: candidate.equipment,
        difficulty: candidate.difficulty,
        movementPattern: candidate.movementPattern,
        score,
        matchReasons: collectMatchReasons(
          currentExercise,
          swapCandidate,
          explicitAlternative
        ),
      } satisfies ExerciseAlternative;
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.name.localeCompare(right.name, "it");
    })
    .slice(0, 5);

  return {
    programExercise,
    workoutCompletedThisWeek,
    alternatives,
  };
}

function parseSwapMetadata(value: Prisma.JsonValue | null): SwapMetadata {
  if (!value) {
    return {};
  }

  if (Array.isArray(value)) {
    return {
      slugCandidates: value.filter((item): item is string => typeof item === "string"),
    };
  }

  if (typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;

  return {
    slugCandidates: Array.isArray(record.slugCandidates)
      ? record.slugCandidates.filter((item): item is string => typeof item === "string")
      : undefined,
    candidateExerciseIds: Array.isArray(record.candidateExerciseIds)
      ? record.candidateExerciseIds.filter(
          (item): item is number => typeof item === "number" && Number.isInteger(item)
        )
      : undefined,
    swapHistory: Array.isArray(record.swapHistory)
      ? record.swapHistory.filter(
          (item): item is SwapHistoryEntry =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as SwapHistoryEntry).swappedAt === "string" &&
            typeof (item as SwapHistoryEntry).reason === "string" &&
            typeof (item as SwapHistoryEntry).oldExerciseName === "string" &&
            typeof (item as SwapHistoryEntry).newExerciseName === "string"
        )
      : undefined,
  };
}

export function buildSwapMetadata(
  currentValue: Prisma.JsonValue | null,
  candidateExerciseIds: number[],
  historyEntry: SwapHistoryEntry
) {
  const currentMetadata = parseSwapMetadata(currentValue);

  return {
    ...currentMetadata,
    candidateExerciseIds,
    swapHistory: [...(currentMetadata.swapHistory ?? []), historyEntry],
  } satisfies SwapMetadata;
}

export async function countWorkoutSetLogsForProgramExercise(programExerciseId: number) {
  return prisma.workoutSetLog.count({
    where: {
      programExerciseId,
    },
  });
}
