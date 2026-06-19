import type { EngineExercise, NormalizedTrainingProfile } from "./types";

type ExerciseQualityStatus =
  | "pending_review"
  | "usable_candidate"
  | "specialized_equipment"
  | "missing_media"
  | "low_confidence";

type ExerciseEngineStatus =
  | "active_candidate"
  | "conditional_candidate"
  | "excluded_v1";

type ExerciseSourceMetadata = {
  qualityStatus?: ExerciseQualityStatus;
  engineStatus?: ExerciseEngineStatus;
  activatedAt?: string;
  activatedBy?: string;
  activationWarning?: string;
  reviewWarnings?: string[];
  questionnaireContext?: {
    environments?: string[];
    equipment?: string | null;
    difficulty?: string | null;
    limitations?: string[];
    specialistWarning?: boolean;
  };
  rawEquipment?: string | null;
  rawLevel?: string | null;
  rawMechanic?: string | null;
};

type AvailabilityExercise = EngineExercise & {
  externalSource?: string | null;
  sourceMetadata?: unknown;
};

export type ExerciseAvailabilityProfile = {
  profile: NormalizedTrainingProfile;
  mergedAnswers?: Record<string, unknown> | null;
};

export type ExerciseAvailabilityResult = {
  eligible: boolean;
  status: "available" | "conditional" | "excluded";
  reasons: string[];
  warnings: string[];
};

type DifficultyCompatibility = {
  compatible: boolean;
  warnings: string[];
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

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseSourceMetadata(value: unknown): ExerciseSourceMetadata | null {
  const record = normalizeRecord(value);

  if (!record) {
    return null;
  }

  const questionnaireContext = normalizeRecord(record.questionnaireContext);

  return {
    qualityStatus:
      record.qualityStatus === "pending_review" ||
      record.qualityStatus === "usable_candidate" ||
      record.qualityStatus === "specialized_equipment" ||
      record.qualityStatus === "missing_media" ||
      record.qualityStatus === "low_confidence"
        ? record.qualityStatus
        : undefined,
    engineStatus:
      record.engineStatus === "active_candidate" ||
      record.engineStatus === "conditional_candidate" ||
      record.engineStatus === "excluded_v1"
        ? record.engineStatus
        : undefined,
    activatedAt: typeof record.activatedAt === "string" ? record.activatedAt : undefined,
    activatedBy: typeof record.activatedBy === "string" ? record.activatedBy : undefined,
    activationWarning:
      typeof record.activationWarning === "string" ? record.activationWarning : undefined,
    reviewWarnings: normalizeStringArray(record.reviewWarnings),
    questionnaireContext: questionnaireContext
      ? {
          environments: normalizeStringArray(questionnaireContext.environments),
          equipment:
            typeof questionnaireContext.equipment === "string"
              ? questionnaireContext.equipment
              : null,
          difficulty:
            typeof questionnaireContext.difficulty === "string"
              ? questionnaireContext.difficulty
              : null,
          limitations: normalizeStringArray(questionnaireContext.limitations),
          specialistWarning: questionnaireContext.specialistWarning === true,
        }
      : undefined,
    rawEquipment: typeof record.rawEquipment === "string" ? record.rawEquipment : null,
    rawLevel: typeof record.rawLevel === "string" ? record.rawLevel : null,
    rawMechanic: typeof record.rawMechanic === "string" ? record.rawMechanic : null,
  };
}

function normalizeAvailabilityProfile(
  value: NormalizedTrainingProfile | ExerciseAvailabilityProfile
): ExerciseAvailabilityProfile {
  if ("profile" in value) {
    return value;
  }

  return {
    profile: value,
  };
}

function collectTextValues(value: unknown): string[] {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const normalized = normalizeText(String(value));
    return normalized ? [normalized] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTextValues(entry));
  }

  const record = normalizeRecord(value);

  if (!record) {
    return [];
  }

  return Object.values(record).flatMap((entry) => collectTextValues(entry));
}

function getUserContextText(input: ExerciseAvailabilityProfile) {
  const profileText = [
    input.profile.environment,
    input.profile.experience,
    ...input.profile.equipmentPreference,
    ...input.profile.limitations,
    ...input.profile.preferredTraining,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
  const mergedAnswerText = collectTextValues(input.mergedAnswers).join(" ");

  return `${profileText} ${mergedAnswerText}`.trim();
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

function hasAnyMatch(sourceText: string, keywords: string[]) {
  return keywords.some((keyword) => sourceText.includes(normalizeText(keyword)));
}

function hasAny(source: string[], expected: string[]) {
  return expected.some((item) => source.includes(normalizeText(item)));
}

function buildExerciseText(exercise: AvailabilityExercise, metadata: ExerciseSourceMetadata | null) {
  return [
    exercise.name,
    exercise.slug,
    exercise.primaryMuscle,
    exercise.category,
    exercise.equipment,
    exercise.difficulty,
    exercise.movementPattern,
    metadata?.rawEquipment,
    metadata?.rawLevel,
    metadata?.rawMechanic,
    metadata?.questionnaireContext?.equipment,
    ...normalizeStringArray(exercise.tags),
    ...normalizeStringArray(exercise.environments),
    ...(metadata?.reviewWarnings ?? []),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function getExerciseEquipmentFamilies(
  exercise: AvailabilityExercise,
  metadata: ExerciseSourceMetadata | null
) {
  const text = buildExerciseText(exercise, metadata);
  const families = new Set<string>();

  if (hasAnyMatch(text, ["bodyweight", "corpo libero", "push up", "pull up"])) {
    families.add("bodyweight");
  }

  if (hasAnyMatch(text, ["dumbbell", "manubri", "manubrio"])) {
    families.add("dumbbells");
  }

  if (hasAnyMatch(text, ["barbell", "bilanciere"])) {
    families.add("barbell");
  }

  if (hasAnyMatch(text, ["band", "elastico", "elastici"])) {
    families.add("bands");
  }

  if (hasAnyMatch(text, ["machine", "macchina", "macchine"])) {
    families.add("machines");
  }

  if (hasAnyMatch(text, ["cable", "cavi", "cavo"])) {
    families.add("cables");
  }

  if (hasAnyMatch(text, ["bike", "cyclette"])) {
    families.add("bike");
  }

  if (hasAnyMatch(text, ["treadmill", "tapis roulant"])) {
    families.add("treadmill");
  }

  if (hasAnyMatch(text, ["elliptical", "ellittica"])) {
    families.add("elliptical");
  }

  if (hasAnyMatch(text, ["mat", "tappetino"])) {
    families.add("mat");
  }

  if (hasAnyMatch(text, ["rope", "corda"])) {
    families.add("rope");
  }

  if (hasAnyMatch(text, ["sled", "slitta", "prowler"])) {
    families.add("sled");
  }

  if (hasAnyMatch(text, ["climbing", "rock climbing", "arrampic", "boulder", "hangboard"])) {
    families.add("climbing");
  }

  if (hasAnyMatch(text, ["tire", "pneumatic", "gomma"])) {
    families.add("tire");
  }

  if (hasAnyMatch(text, ["strongman", "atlas stone", "yoke", "farmer walk", "keg"])) {
    families.add("strongman");
  }

  if (hasAnyMatch(text, ["snatch", "clean and jerk", "clean", "jerk", "weightlifting", "halter"])) {
    families.add("olympic");
  }

  return families;
}

function getUserEquipmentFamilies(context: ExerciseAvailabilityProfile) {
  const families = new Set<string>(
    context.profile.equipmentPreference.map((item) => normalizeText(item))
  );
  const userText = getUserContextText(context);

  if (context.profile.environment === "gym" || context.profile.environment === "mixed") {
    families.add("machines");
    families.add("cables");
    families.add("barbell");
    families.add("dumbbells");
    families.add("bodyweight");
  }

  if (context.profile.environment === "home" || context.profile.environment === "unknown") {
    families.add("bodyweight");
  }

  if (context.profile.environment === "outdoor") {
    families.add("bodyweight");
  }

  if (hasAnyMatch(userText, ["rope", "corda", "battle rope"])) {
    families.add("rope");
  }

  if (hasAnyMatch(userText, ["sled", "slitta", "prowler"])) {
    families.add("sled");
  }

  if (hasAnyMatch(userText, ["climbing", "rock climbing", "arrampic", "parete", "boulder"])) {
    families.add("climbing");
  }

  if (hasAnyMatch(userText, ["tire", "pneumatico", "strongman", "atlas stone", "yoke"])) {
    families.add("tire");
    families.add("strongman");
  }

  if (hasAnyMatch(userText, ["olympic lifting", "weightlifting", "halterofilia", "snatch", "clean", "jerk"])) {
    families.add("olympic");
  }

  return families;
}

function getNormalizedDifficulty(
  value: string | null | undefined,
  metadata: ExerciseSourceMetadata | null
) {
  const difficulty = normalizeText(value || metadata?.questionnaireContext?.difficulty || metadata?.rawLevel);

  if (difficulty === "advanced" || difficulty === "intermediate") {
    return difficulty;
  }

  return "beginner";
}

function getDifficultyCompatibility(
  exercise: AvailabilityExercise,
  metadata: ExerciseSourceMetadata | null,
  profile: NormalizedTrainingProfile
): DifficultyCompatibility {
  const difficulty = getNormalizedDifficulty(exercise.difficulty, metadata);
  const tags = normalizeStringArray(exercise.tags);
  const category = normalizeText(exercise.category);
  const exerciseText = buildExerciseText(exercise, metadata);

  if (profile.experience === "advanced") {
    return {
      compatible: true,
      warnings: [],
    };
  }

  if (profile.experience === "beginner") {
    if (difficulty === "advanced") {
      return {
        compatible: false,
        warnings: [],
      };
    }

    if (
      difficulty === "intermediate" &&
      !hasAny(tags, ["beginner_friendly", "low_impact"]) &&
      category !== "mobility" &&
      category !== "prehab" &&
      category !== "core"
    ) {
      return {
        compatible: false,
        warnings: [],
      };
    }

    return {
      compatible: true,
      warnings:
        difficulty === "intermediate" ? ["beginner_receiving_simple_intermediate"] : [],
    };
  }

  if (difficulty !== "advanced") {
    return {
      compatible: true,
      warnings: [],
    };
  }

  const canHandleAdvanced =
    hasAny(tags, ["compound", "strength"]) ||
    hasAnyMatch(exerciseText, ["strength", "forza"]) ||
    profile.preferredTraining.includes("weights");

  return {
    compatible: canHandleAdvanced,
    warnings: canHandleAdvanced ? ["intermediate_receiving_coherent_advanced"] : [],
  };
}

function matchesEnvironment(
  exercise: AvailabilityExercise,
  metadata: ExerciseSourceMetadata | null,
  profile: NormalizedTrainingProfile
) {
  const environments = [
    ...normalizeStringArray(exercise.environments),
    ...(metadata?.questionnaireContext?.environments ?? []).map(normalizeText),
  ].filter(Boolean);

  if (environments.length === 0) {
    return true;
  }

  return hasAny(environments, getAllowedEnvironments(profile));
}

function matchesEquipment(
  exercise: AvailabilityExercise,
  metadata: ExerciseSourceMetadata | null,
  context: ExerciseAvailabilityProfile
) {
  const exerciseFamilies = getExerciseEquipmentFamilies(exercise, metadata);

  if (exerciseFamilies.size === 0) {
    return true;
  }

  const specialistFamilies = [...exerciseFamilies].filter((item) =>
    ["rope", "sled", "climbing", "tire", "strongman", "olympic"].includes(item)
  );

  if (specialistFamilies.length > 0) {
    return specialistFamilies.every((item) => getUserEquipmentFamilies(context).has(item));
  }

  if (exerciseFamilies.size === 1 && (exerciseFamilies.has("bodyweight") || exerciseFamilies.has("mat"))) {
    return true;
  }

  const userFamilies = getUserEquipmentFamilies(context);

  return [...exerciseFamilies].some((family) => userFamilies.has(family));
}

function getRestrictionSignals(
  exercise: AvailabilityExercise,
  metadata: ExerciseSourceMetadata | null
) {
  const movementPattern = normalizeText(exercise.movementPattern);
  const tags = normalizeStringArray(exercise.tags);
  const contraindications = normalizeStringArray(exercise.contraindications);
  const warningText = (metadata?.reviewWarnings ?? []).map(normalizeText).join(" ");
  const exerciseText = buildExerciseText(exercise, metadata);

  return {
    movementPattern,
    tags,
    contraindications,
    warningText,
    exerciseText,
  };
}

function getIncompatibleLimitations(
  exercise: AvailabilityExercise,
  metadata: ExerciseSourceMetadata | null,
  profile: NormalizedTrainingProfile
) {
  const signals = getRestrictionSignals(exercise, metadata);
  const reasons: string[] = [];

  if (
    profile.limitations.includes("knee") &&
    (
      signals.contraindications.includes("knee") ||
      signals.tags.includes("knee_caution") ||
      signals.tags.includes("high_impact") ||
      signals.movementPattern === "lunge" ||
      hasAnyMatch(signals.warningText, ["knee", "ginocchio"]) ||
      hasAnyMatch(signals.exerciseText, ["jump squat", "plyometric"])
    )
  ) {
    reasons.push("limitation_knee");
  }

  if (
    profile.limitations.includes("no_jump") &&
    (
      signals.tags.includes("high_impact") ||
      hasAnyMatch(signals.warningText, ["jump", "salti", "high impact"]) ||
      hasAnyMatch(signals.exerciseText, ["jump", "plyometric", "box jump"])
    )
  ) {
    reasons.push("limitation_no_jump");
  }

  if (
    profile.limitations.includes("shoulder") &&
    (
      signals.contraindications.includes("shoulder") ||
      signals.tags.includes("shoulder_caution") ||
      signals.movementPattern === "vertical_push" ||
      hasAnyMatch(signals.warningText, ["shoulder", "spalla", "overhead"]) ||
      hasAnyMatch(signals.exerciseText, ["overhead", "behind the neck"])
    )
  ) {
    reasons.push("limitation_shoulder");
  }

  if (
    profile.limitations.includes("back") &&
    (
      signals.contraindications.includes("back") ||
      signals.tags.includes("back_caution") ||
      signals.movementPattern === "hinge" ||
      hasAnyMatch(signals.warningText, ["back", "schiena", "lomb"]) ||
      hasAnyMatch(signals.exerciseText, ["good morning", "jefferson curl", "deadlift"])
    )
  ) {
    reasons.push("limitation_back");
  }

  return reasons;
}

function getSpecialistDomains(
  exercise: AvailabilityExercise,
  metadata: ExerciseSourceMetadata | null
) {
  const families = getExerciseEquipmentFamilies(exercise, metadata);
  return [...families].filter((item) =>
    ["climbing", "rope", "sled", "tire", "strongman", "olympic"].includes(item)
  );
}

function hasExplicitSpecialistCompatibility(
  exercise: AvailabilityExercise,
  metadata: ExerciseSourceMetadata | null,
  context: ExerciseAvailabilityProfile
) {
  const userText = getUserContextText(context);
  const domains = getSpecialistDomains(exercise, metadata);

  if (domains.length === 0) {
    return false;
  }

  return domains.every((domain) => {
    switch (domain) {
      case "climbing":
        return hasAnyMatch(userText, [
          "climbing",
          "rock climbing",
          "arrampic",
          "parete",
          "boulder",
        ]);
      case "rope":
        return hasAnyMatch(userText, ["rope", "corda", "crossfit", "box"]);
      case "sled":
        return hasAnyMatch(userText, ["sled", "slitta", "crossfit", "box"]);
      case "tire":
      case "strongman":
        return hasAnyMatch(userText, [
          "strongman",
          "tire",
          "pneumatico",
          "atlas stone",
          "yoke",
        ]);
      case "olympic":
        return (
          context.profile.experience !== "beginner" &&
          (context.profile.environment === "gym" || context.profile.environment === "mixed") &&
          getUserEquipmentFamilies(context).has("barbell") &&
          hasAnyMatch(userText, [
            "weightlifting",
            "olympic lifting",
            "halterofilia",
            "snatch",
            "clean",
            "jerk",
          ])
        );
      default:
        return false;
    }
  });
}

export function getExerciseAvailabilityForUser(
  exercise: AvailabilityExercise,
  onboardingProfile: NormalizedTrainingProfile | ExerciseAvailabilityProfile
): ExerciseAvailabilityResult {
  const context = normalizeAvailabilityProfile(onboardingProfile);
  const metadata = parseSourceMetadata(exercise.sourceMetadata);
  const environments = normalizeStringArray(exercise.environments);
  const isInternalExercise = !exercise.externalSource;

  const qualityStatus = metadata?.qualityStatus;
  const engineStatus = metadata?.engineStatus;

  if (!isInternalExercise && environments.includes("external_import_pending")) {
    return {
      eligible: false,
      status: "excluded",
      reasons: ["external_import_pending"],
      warnings: ["excluded_from_engine_v1"],
    };
  }

  if (
    !isInternalExercise &&
    (
      qualityStatus === "low_confidence" ||
      qualityStatus === "missing_media" ||
      engineStatus === "excluded_v1"
    )
  ) {
    return {
      eligible: false,
      status: "excluded",
      reasons: [engineStatus === "excluded_v1" ? "engine_status_excluded_v1" : `quality_status_${qualityStatus}`],
      warnings: ["excluded_from_engine_v1"],
    };
  }

  if (!isInternalExercise && (!qualityStatus || qualityStatus === "pending_review")) {
    return {
      eligible: false,
      status: "excluded",
      reasons: ["quality_status_pending_review"],
      warnings: ["excluded_from_engine_v1"],
    };
  }

  if (
    !isInternalExercise &&
    qualityStatus === "usable_candidate" &&
    engineStatus !== "active_candidate"
  ) {
    return {
      eligible: false,
      status: "excluded",
      reasons: ["engine_status_not_activated"],
      warnings: ["excluded_from_engine_v1"],
    };
  }

  if (
    !isInternalExercise &&
    qualityStatus === "specialized_equipment" &&
    engineStatus !== "conditional_candidate"
  ) {
    return {
      eligible: false,
      status: "excluded",
      reasons: ["engine_status_not_conditional"],
      warnings: ["excluded_from_engine_v1"],
    };
  }

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!normalizeText(exercise.primaryMuscle)) {
    reasons.push("missing_primary_muscle");
  }

  if (!matchesEnvironment(exercise, metadata, context.profile)) {
    reasons.push("environment_mismatch");
  }

  if (!matchesEquipment(exercise, metadata, context)) {
    reasons.push("equipment_mismatch");
  }

  const difficultyCompatibility = getDifficultyCompatibility(
    exercise,
    metadata,
    context.profile
  );

  if (!difficultyCompatibility.compatible) {
    reasons.push("difficulty_mismatch");
  } else {
    warnings.push(...difficultyCompatibility.warnings);
  }

  reasons.push(...getIncompatibleLimitations(exercise, metadata, context.profile));

  if (!isInternalExercise && qualityStatus === "specialized_equipment") {
    const specialistCompatible = hasExplicitSpecialistCompatibility(
      exercise,
      metadata,
      context
    );

    if (!specialistCompatible) {
      reasons.push("specialized_context_required");
    } else {
      warnings.push("specialized_context_confirmed");
    }
  }

  const eligible = reasons.length === 0;

  return {
    eligible,
    status: !eligible
      ? "excluded"
      : !isInternalExercise && qualityStatus === "specialized_equipment"
        ? "conditional"
        : "available",
    reasons: eligible
      ? [isInternalExercise ? "internal_exercise" : qualityStatus ?? "external_exercise"]
      : reasons,
    warnings,
  };
}

export function isExerciseEligibleForUser(
  exercise: AvailabilityExercise,
  onboardingProfile: NormalizedTrainingProfile | ExerciseAvailabilityProfile
) {
  return getExerciseAvailabilityForUser(exercise, onboardingProfile).eligible;
}

export function getExerciseAvailabilityReason(
  exercise: AvailabilityExercise,
  onboardingProfile: NormalizedTrainingProfile | ExerciseAvailabilityProfile
) {
  return getExerciseAvailabilityForUser(exercise, onboardingProfile).reasons;
}
