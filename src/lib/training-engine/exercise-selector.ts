import { getPrescription } from "./training-rules";
import type {
  EngineExercise,
  ExerciseRole,
  GeneratedExercise,
  NormalizedTrainingProfile,
} from "./types";

type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";
type ExerciseCategory = "strength" | "core" | "mobility" | "prehab" | "cardio";

export type ExerciseSlot = {
  slotId: string;
  label: string;
  role: ExerciseRole;
  category: ExerciseCategory;
  targetMuscles: string[];
  secondaryMuscles?: string[];
  movementPatterns: string[];
  preferredTags?: string[];
  avoidTags?: string[];
  allowedCategories?: ExerciseCategory[];
  difficultyMax?: ExerciseDifficulty;
  notes: string;
  fallbackSlugs?: string[];
};

type NormalizedExercise = {
  id: number;
  slug: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string | null;
  difficulty: ExerciseDifficulty;
  movementPattern: string | null;
  environments: string[];
  tags: string[];
  alternatives: string[];
  contraindications: string[];
};

type SelectionContext = {
  selectedSlugs: Set<string>;
  slotSelections: Map<string, string>;
};

type ScoredExercise = {
  exercise: NormalizedExercise;
  score: number;
  reasons: string[];
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

function normalizeCategory(value: string | null | undefined): ExerciseCategory {
  const normalized = normalizeText(value);

  if (
    normalized === "core" ||
    normalized === "mobility" ||
    normalized === "prehab" ||
    normalized === "cardio"
  ) {
    return normalized;
  }

  return "strength";
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

function normalizeExercise(exercise: EngineExercise): NormalizedExercise {
  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    category: normalizeCategory(exercise.category),
    primaryMuscle: normalizeText(exercise.primaryMuscle),
    secondaryMuscles: normalizeStringArray(exercise.secondaryMuscles),
    equipment: exercise.equipment ? normalizeText(exercise.equipment) : null,
    difficulty: normalizeDifficulty(exercise.difficulty),
    movementPattern: exercise.movementPattern
      ? normalizeText(exercise.movementPattern)
      : null,
    environments: normalizeStringArray(exercise.environments),
    tags: normalizeStringArray(exercise.tags),
    alternatives: normalizeStringArray(exercise.alternatives),
    contraindications: normalizeStringArray(exercise.contraindications),
  };
}

function hasAny(source: string[], expected: string[]) {
  return expected.some((item) => source.includes(normalizeText(item)));
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
      return 2;
  }
}

function getDifficultyCap(profile: NormalizedTrainingProfile, slot: ExerciseSlot) {
  if (slot.difficultyMax) {
    return slot.difficultyMax;
  }

  return profile.experience;
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
  exercise: NormalizedExercise,
  profile: NormalizedTrainingProfile
) {
  const environments = exercise.environments.length > 0 ? exercise.environments : ["gym"];
  return hasAny(environments, getAllowedEnvironments(profile));
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

    if (item === "bike") {
      mapped.add("cyclette");
      mapped.add("bike");
    }

    if (item === "elliptical") {
      mapped.add("ellittica");
    }

    if (item === "treadmill") {
      mapped.add("tapis roulant");
    }
  }

  if (profile.environment === "gym") {
    mapped.add("macchina");
    mapped.add("cavi");
  }

  if (profile.environment === "home") {
    mapped.add("corpo libero");
  }

  return mapped;
}

function getGoalPreferredTags(
  profile: NormalizedTrainingProfile,
  slot: ExerciseSlot
) {
  if (profile.goal === "strength") {
    return slot.role === "heavy_compound" || slot.role === "compound"
      ? ["compound", "strength", "barbell"]
      : ["compound", "strength"];
  }

  if (profile.goal === "hypertrophy" || profile.goal === "recomposition") {
    if (slot.category === "strength") {
      return ["hypertrophy", "machine", "dumbbell", "cable", "compound"];
    }

    return ["hypertrophy", "stability"];
  }

  if (profile.goal === "fat_loss") {
    return slot.category === "cardio"
      ? ["low_impact", "conditioning", "cardio"]
      : ["compound", "hypertrophy", "strength"];
  }

  if (profile.goal === "wellness") {
    return ["beginner_friendly", "low_impact", "mobility", "prehab", "shoulder_friendly"];
  }

  return [];
}

function getLimitationPenalty(
  profile: NormalizedTrainingProfile,
  slot: ExerciseSlot,
  exercise: NormalizedExercise
) {
  let penalty = 0;

  const tags = exercise.tags;
  const contraindications = exercise.contraindications;
  const pattern = exercise.movementPattern ?? "";

  if (profile.limitations.includes("knee")) {
    if (
      contraindications.includes("knee") ||
      tags.includes("knee_caution") ||
      tags.includes("high_impact") ||
      pattern === "lunge"
    ) {
      penalty -= slot.slotId.includes("primary") ? 40 : 24;
    }

    if (tags.includes("low_impact") || tags.includes("beginner_friendly")) {
      penalty += 10;
    }
  }

  if (profile.limitations.includes("no_jump") && tags.includes("high_impact")) {
    penalty -= 35;
  }

  if (profile.limitations.includes("shoulder")) {
    if (
      contraindications.includes("shoulder") ||
      tags.includes("shoulder_caution") ||
      pattern === "vertical_push"
    ) {
      penalty -= slot.category === "mobility" || slot.category === "prehab" ? 8 : 36;
    }

    if (tags.includes("shoulder_friendly") || exercise.category === "prehab") {
      penalty += 10;
    }
  }

  if (profile.limitations.includes("back")) {
    if (
      contraindications.includes("back") ||
      tags.includes("back_caution") ||
      pattern === "hinge"
    ) {
      penalty -= slot.slotId.includes("primary") ? 40 : 24;
    }

    if (tags.includes("beginner_friendly") || exercise.category === "core") {
      penalty += 8;
    }
  }

  return penalty;
}

function buildReasonableFallbackCandidates(
  slot: ExerciseSlot,
  exercises: NormalizedExercise[],
  profile: NormalizedTrainingProfile
) {
  const fallbacks = new Set(slot.fallbackSlugs ?? []);

  for (const exercise of exercises) {
    if (
      matchesEnvironment(exercise, profile) &&
      slot.movementPatterns.includes(exercise.movementPattern ?? "") &&
      slot.targetMuscles.includes(exercise.primaryMuscle)
    ) {
      fallbacks.add(exercise.slug);
    }
  }

  return [...fallbacks];
}

export function scoreExerciseForSlot(
  exerciseInput: EngineExercise,
  slot: ExerciseSlot,
  profile: NormalizedTrainingProfile,
  context: SelectionContext
) {
  const exercise = normalizeExercise(exerciseInput);
  const reasons: string[] = [];
  let score = 0;
  const allowedCategories = slot.allowedCategories ?? [slot.category];

  if (!allowedCategories.includes(exercise.category)) {
    return {
      exercise,
      score: Number.NEGATIVE_INFINITY,
      reasons: ["category_mismatch"],
    } satisfies ScoredExercise;
  }

  if (exercise.category === "cardio" && profile.goal === "hypertrophy") {
    return {
      exercise,
      score: Number.NEGATIVE_INFINITY,
      reasons: ["cardio_not_allowed"],
    } satisfies ScoredExercise;
  }

  if (slot.targetMuscles.includes(exercise.primaryMuscle)) {
    score += 50;
    reasons.push("primary_muscle");
  } else if (hasAny(exercise.secondaryMuscles, slot.targetMuscles)) {
    score += 22;
    reasons.push("secondary_muscle");
  } else {
    score -= 14;
  }

  if (slot.secondaryMuscles && hasAny(exercise.secondaryMuscles, slot.secondaryMuscles)) {
    score += 10;
  }

  if (slot.movementPatterns.includes(exercise.movementPattern ?? "")) {
    score += 28;
    reasons.push("movement_pattern");
  } else if (slot.category === "mobility" && exercise.category === "prehab") {
    score += 8;
  } else {
    score -= 8;
  }

  if (slot.preferredTags && hasAny(exercise.tags, slot.preferredTags)) {
    score += 15;
    reasons.push("preferred_tag");
  }

  if (slot.avoidTags && hasAny(exercise.tags, slot.avoidTags)) {
    score -= 18;
  }

  if (matchesEnvironment(exercise, profile)) {
    score += 12;
  } else if (profile.environment === "home" || profile.environment === "outdoor") {
    return {
      exercise,
      score: Number.NEGATIVE_INFINITY,
      reasons: ["environment_mismatch"],
    } satisfies ScoredExercise;
  } else {
    score -= 24;
  }

  const preferredEquipment = getPreferredEquipment(profile);
  if (
    exercise.equipment &&
    (preferredEquipment.has(exercise.equipment) || hasAny(exercise.tags, [...preferredEquipment]))
  ) {
    score += 14;
  } else if (exercise.equipment && profile.environment === "home") {
    score -= 12;
  }

  if (profile.environment === "gym" && exercise.tags.includes("bodyweight")) {
    score -= profile.goal === "wellness" ? 0 : 6;
  }

  if (profile.experience === "beginner") {
    if (exercise.difficulty === "advanced") {
      score -= 28;
    }

    if (exercise.tags.includes("beginner_friendly")) {
      score += 16;
    }
  }

  if (profile.experience === "advanced" && exercise.difficulty !== "beginner") {
    score += 6;
  }

  if (getDifficultyRank(exercise.difficulty) > getDifficultyRank(getDifficultyCap(profile, slot))) {
    score -= 18;
  }

  if (slot.role === "heavy_compound" && exercise.tags.includes("compound")) {
    score += 8;
  }

  if (slot.role === "isolation" && exercise.tags.includes("isolation")) {
    score += 10;
  }

  if (slot.role === "mobility" && (exercise.tags.includes("mobility") || exercise.tags.includes("prehab"))) {
    score += 12;
  }

  if (slot.role === "core" && exercise.category === "core") {
    score += 16;
  }

  score += getLimitationPenalty(profile, slot, exercise);

  for (const tag of getGoalPreferredTags(profile, slot)) {
    if (exercise.tags.includes(tag)) {
      score += 6;
    }
  }

  if (profile.goal === "fat_loss" && slot.category !== "cardio" && exercise.category === "cardio") {
    score -= 20;
  }

  if (profile.goal === "wellness" && exercise.tags.includes("low_impact")) {
    score += 10;
  }

  if (profile.goal === "wellness" && exercise.tags.includes("high_impact")) {
    score -= 18;
  }

  if (context.selectedSlugs.has(exercise.slug)) {
    score -= 30;
    reasons.push("duplicate_program");
  }

  const previousForFamily = context.slotSelections.get(slot.label);
  if (previousForFamily === exercise.slug) {
    score -= 20;
  }

  return {
    exercise,
    score,
    reasons,
  } satisfies ScoredExercise;
}

export function avoidDuplicateExercises(
  candidates: ScoredExercise[],
  context: SelectionContext
) {
  const unique = candidates.filter(
    (candidate) => !context.selectedSlugs.has(candidate.exercise.slug)
  );

  return unique.length > 0 ? unique : candidates;
}

export function selectAlternativeExercise(
  selected: NormalizedExercise,
  candidates: ScoredExercise[],
  context: SelectionContext
) {
  const alternatives = candidates.filter((candidate) => {
    if (candidate.exercise.slug === selected.slug) {
      return false;
    }

    const isAlternative =
      selected.alternatives.includes(candidate.exercise.slug) ||
      candidate.exercise.alternatives.includes(selected.slug);

    return isAlternative && !context.selectedSlugs.has(candidate.exercise.slug);
  });

  return alternatives[0] ?? null;
}

export function selectExerciseForSlot(
  slot: ExerciseSlot,
  profile: NormalizedTrainingProfile,
  exercises: EngineExercise[],
  context: SelectionContext
): GeneratedExercise {
  const scored = exercises
    .map((exercise) => scoreExerciseForSlot(exercise, slot, profile, context))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score);

  const deduped = avoidDuplicateExercises(scored, context);
  const bestOverall = scored[0] ?? null;
  const bestUnique = deduped[0] ?? null;
  const selected =
    bestOverall &&
    bestUnique &&
    context.selectedSlugs.has(bestOverall.exercise.slug) &&
    bestOverall.score - bestUnique.score > 12
      ? bestOverall
      : bestUnique ?? bestOverall;

  if (!selected) {
    const prescription = getPrescription(profile, slot.role);

    return {
      slugCandidates: slot.fallbackSlugs ?? [],
      nameFallback: slot.label,
      sets: prescription.sets,
      reps: prescription.reps,
      restSeconds: prescription.restSeconds,
      intensity: prescription.intensity,
      notes: `${slot.notes} Selezione prudente: nessun esercizio perfetto trovato, usa una variante equivalente.`,
    };
  }

  let primary = selected;
  const alternative = selectAlternativeExercise(selected.exercise, deduped, context);

  if (
    alternative &&
    selected.score - alternative.score <= 4 &&
    context.slotSelections.get(slot.label) === selected.exercise.slug
  ) {
    primary = alternative;
  }

  const normalizedExercises = exercises.map(normalizeExercise);
  const prescription = getPrescription(profile, slot.role);
  const topCandidates = avoidDuplicateExercises(
    [primary, ...deduped.filter((candidate) => candidate.exercise.slug !== primary.exercise.slug)],
    context
  )
    .slice(0, 4)
    .map((candidate) => candidate.exercise.slug);
  const fallbackCandidates = buildReasonableFallbackCandidates(
    slot,
    normalizedExercises,
    profile
  );
  const slugCandidates = [...new Set([...topCandidates, ...fallbackCandidates])];

  context.selectedSlugs.add(primary.exercise.slug);
  context.slotSelections.set(slot.label, primary.exercise.slug);

  const debugNote =
    primary.reasons.includes("duplicate_program") || primary.reasons.length === 0
      ? "Scelta fatta per coerenza generale e disponibilita."
      : `Scelta coerente con ${slot.label.toLowerCase()}.`;

  return {
    slugCandidates,
    nameFallback: primary.exercise.name,
    sets: prescription.sets,
    reps: prescription.reps,
    restSeconds: prescription.restSeconds,
    intensity: prescription.intensity,
    notes: `${slot.notes} ${debugNote}`,
  };
}
