import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const EXTERNAL_SOURCE = "free_exercise_db";
export const DEFAULT_PROGRAM_LIMIT = 50;
export const DEFAULT_TOP_LIMIT = 30;

const CARDIO_ALIAS_MAP = new Map([
  ["bike-cyclette", ["bike", "cycle", "stationary bike", "exercise bike"]],
  ["camminata-inclinata", ["treadmill", "incline walk", "incline walking", "walking treadmill"]],
  ["camminata-treadmill", ["treadmill", "walking", "walking treadmill"]],
  ["vogatore", ["rower", "rowing machine", "rowing"]],
  ["stair-climber", ["stair climber", "stairmaster", "stepper", "stairs"]],
  ["ellittica", ["elliptical", "cross trainer"]],
]);

const EXPLICIT_SOURCE_SLUG_MAP = new Map([
  ["hip-thrust", ["barbell-hip-thrust"]],
  ["alzate-laterali", ["side-lateral-raise"]],
  ["seated-cable-row", ["seated-cable-rows"]],
  ["split-squat-statico", ["split-squats"]],
  ["calf-raise", ["standing-calf-raises"]],
  ["chest-press-macchina", ["machine-bench-press"]],
  ["pull-through-cavo", ["pull-through"]],
  ["pulley-basso", ["seated-cable-rows"]],
  ["assisted-pull-up", ["band-assisted-pull-up"]],
  ["farmer-walk", ["farmers-walk"]],
  ["arnold-press", ["arnold-dumbbell-press"]],
  ["chest-press-inclinata", ["leverage-incline-chest-press"]],
  ["leg-curl-sdraiato", ["lying-leg-curls"]],
  ["panca-piana-manubri", ["dumbbell-bench-press"]],
  ["donkey-calf-raise", ["donkey-calf-raises"]],
  ["hammer-curl", ["hammer-curls"]],
  ["single-arm-lat-pulldown", ["one-arm-lat-pulldown"]],
  ["overhead-cable-extension", ["cable-rope-overhead-triceps-extension"]],
  ["curl-inclinato", ["incline-dumbbell-curl"]],
  ["floor-press-manubri", ["dumbbell-floor-press"]],
]);

const GENERIC_TOKENS = new Set([
  "a",
  "an",
  "and",
  "con",
  "da",
  "di",
  "exercise",
  "esercizio",
  "for",
  "in",
  "machine",
  "macchina",
  "on",
  "per",
  "su",
  "the",
  "to",
  "with",
]);

export function parseIntegerArg(argv, key, defaultValue) {
  const prefix = `--${key}=`;
  const raw = argv.find((arg) => arg.startsWith(prefix));

  if (!raw) {
    return defaultValue;
  }

  const parsed = Number.parseInt(raw.slice(prefix.length), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${key} value: ${raw}`);
  }

  return parsed;
}

export function normalizeText(value) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
    : "";
}

export function normalizeSlug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

export function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

export function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

export function hasImages(value) {
  return normalizeArray(value).length > 0;
}

function tokenize(value) {
  return uniqueStrings(
    normalizeText(value)
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !GENERIC_TOKENS.has(token))
  );
}

function getPrimaryMuscleTokens(primaryMuscle) {
  const normalized = normalizeText(primaryMuscle);

  if (
    normalized.includes("core") ||
    normalized.includes("abs") ||
    normalized.includes("abdom") ||
    normalized.includes("addom")
  ) {
    return "core";
  }

  return normalized;
}

export function getMovementBucket(exercise) {
  const category = normalizeText(exercise.category);
  const primaryMuscle = getPrimaryMuscleTokens(exercise.primaryMuscle);
  const name = normalizeText(exercise.name);
  const tags = normalizeArray(exercise.tags).map(normalizeText).join(" ");

  if (category.includes("cardio")) {
    return "cardio";
  }

  if (
    category.includes("mobility") ||
    category.includes("stretch") ||
    tags.includes("mobility") ||
    tags.includes("stretch")
  ) {
    return "mobility";
  }

  if (
    primaryMuscle === "core" ||
    name.includes("plank") ||
    name.includes("dead bug") ||
    name.includes("hollow")
  ) {
    return "core";
  }

  return "strength";
}

export function getSourceBucket(exercise) {
  return exercise.externalSource === EXTERNAL_SOURCE ? "importati" : "interni";
}

function buildCoverageMap(programs) {
  const usageByExerciseId = new Map();

  for (const program of programs) {
    const programSeen = new Set();

    for (const workout of program.workouts) {
      for (const programExercise of workout.exercises) {
        const exercise = programExercise.exercise;

        if (!exercise || hasImages(exercise.imageUrls)) {
          continue;
        }

        const key = exercise.id;
        const existing = usageByExerciseId.get(key) ?? {
          exerciseId: exercise.id,
          name: exercise.name,
          slug: exercise.slug,
          category: exercise.category,
          primaryMuscle: exercise.primaryMuscle,
          equipment: exercise.equipment,
          externalSource: exercise.externalSource,
          imageCount: 0,
          usageCount: 0,
          distinctPrograms: 0,
        };

        existing.usageCount += 1;

        if (!programSeen.has(key)) {
          existing.distinctPrograms += 1;
          programSeen.add(key);
        }

        usageByExerciseId.set(key, existing);
      }
    }
  }

  return [...usageByExerciseId.values()]
    .map((entry) => ({
      ...entry,
      movementBucket: getMovementBucket(entry),
      sourceBucket: getSourceBucket(entry),
    }))
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount;
      }

      if (right.distinctPrograms !== left.distinctPrograms) {
        return right.distinctPrograms - left.distinctPrograms;
      }

      return left.name.localeCompare(right.name, "it");
    });
}

export async function getMissingMediaCoverage({ programLimit = DEFAULT_PROGRAM_LIMIT } = {}) {
  const recentPrograms = await prisma.trainingProgram.findMany({
    take: programLimit,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      workouts: {
        select: {
          id: true,
          exercises: {
            where: {
              isActive: true,
              exerciseId: {
                not: null,
              },
            },
            select: {
              id: true,
              exercise: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  category: true,
                  primaryMuscle: true,
                  equipment: true,
                  externalSource: true,
                  imageUrls: true,
                  tags: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const topMissing = buildCoverageMap(recentPrograms);

  return {
    programLimit,
    analyzedPrograms: recentPrograms.length,
    missingExercises: topMissing,
  };
}

export function printCoverageReport(coverage, topLimit = DEFAULT_TOP_LIMIT) {
  const topExercises = coverage.missingExercises.slice(0, topLimit);
  const summary = {
    strength: 0,
    cardio: 0,
    mobility: 0,
    core: 0,
    interni: 0,
    importati: 0,
  };

  for (const exercise of coverage.missingExercises) {
    summary[exercise.movementBucket] += 1;
    summary[exercise.sourceBucket] += 1;
  }

  console.log("Exercise media coverage audit");
  console.log(`programmi analizzati: ${coverage.analyzedPrograms}`);
  console.log(`esercizi senza immagini trovati: ${coverage.missingExercises.length}`);
  console.log(`strength: ${summary.strength}`);
  console.log(`cardio: ${summary.cardio}`);
  console.log(`mobility: ${summary.mobility}`);
  console.log(`core: ${summary.core}`);
  console.log(`interni: ${summary.interni}`);
  console.log(`importati: ${summary.importati}`);
  console.log("");
  console.log(`Top ${Math.min(topLimit, topExercises.length)} esercizi usati senza immagini`);

  topExercises.forEach((exercise, index) => {
    console.log(
      `${index + 1}. ${exercise.name} | slug=${exercise.slug} | uso=${exercise.usageCount} | programmi=${exercise.distinctPrograms} | bucket=${exercise.movementBucket} | source=${exercise.sourceBucket}`
    );
  });
}

function buildAliasSlugs(target) {
  const aliases = new Set([
    normalizeSlug(target.slug),
    normalizeSlug(target.name),
  ]);
  const explicitAliases = EXPLICIT_SOURCE_SLUG_MAP.get(normalizeSlug(target.slug)) ?? [];

  const cardioAliases = CARDIO_ALIAS_MAP.get(normalizeSlug(target.slug)) ?? [];

  for (const alias of explicitAliases) {
    aliases.add(normalizeSlug(alias));
  }

  for (const alias of cardioAliases) {
    aliases.add(normalizeSlug(alias));
  }

  return [...aliases].filter(Boolean);
}

function getCardioKeywords(target) {
  return uniqueStrings([
    ...buildAliasSlugs(target),
    ...(CARDIO_ALIAS_MAP.get(normalizeSlug(target.slug)) ?? []).map(normalizeText),
  ]);
}

function buildSourceIndexes(sourceExercises) {
  const bySlug = new Map();
  const byName = new Map();

  for (const source of sourceExercises) {
    const slugKey = normalizeSlug(source.slug);
    const nameKey = normalizeText(source.name);

    if (!bySlug.has(slugKey)) {
      bySlug.set(slugKey, []);
    }

    if (!byName.has(nameKey)) {
      byName.set(nameKey, []);
    }

    bySlug.get(slugKey).push(source);
    byName.get(nameKey).push(source);
  }

  return {
    bySlug,
    byName,
  };
}

function sharesBroadBucket(target, source) {
  const targetBucket = getMovementBucket(target);
  const sourceBucket = getMovementBucket(source);

  if (targetBucket === "cardio" || sourceBucket === "cardio") {
    return targetBucket === sourceBucket;
  }

  if (targetBucket === "mobility" || sourceBucket === "mobility") {
    return targetBucket === sourceBucket;
  }

  return true;
}

function computeTokenSimilarity(target, source) {
  const left = new Set(tokenize(`${target.name} ${target.slug}`));
  const right = new Set(tokenize(`${source.name} ${source.slug}`));

  if (left.size === 0 || right.size === 0) {
    return {
      score: 0,
      overlapCount: 0,
    };
  }

  let overlapCount = 0;

  for (const token of left) {
    if (right.has(token)) {
      overlapCount += 1;
    }
  }

  const unionSize = new Set([...left, ...right]).size;

  return {
    score: unionSize > 0 ? overlapCount / unionSize : 0,
    overlapCount,
  };
}

function rankCardioCandidate(target, source, candidateKeywords) {
  const sourceText = `${normalizeText(source.name)} ${normalizeSlug(source.slug)}`;

  if (normalizeSlug(target.slug) === normalizeSlug(source.slug)) {
    return { score: 100, reason: "slug_exact" };
  }

  if (normalizeText(target.name) === normalizeText(source.name)) {
    return { score: 96, reason: "name_exact" };
  }

  for (const keyword of candidateKeywords) {
    if (!keyword) {
      continue;
    }

    const normalizedKeyword = normalizeText(keyword).replace(/-/g, " ");

    if (sourceText.includes(normalizedKeyword)) {
      return { score: 90, reason: `cardio_alias:${keyword}` };
    }
  }

  return null;
}

function rankStrengthLikeCandidate(target, source) {
  if (!sharesBroadBucket(target, source)) {
    return null;
  }

  if (normalizeSlug(target.slug) === normalizeSlug(source.slug)) {
    return { score: 100, reason: "slug_exact" };
  }

  if (normalizeText(target.name) === normalizeText(source.name)) {
    return { score: 95, reason: "name_exact" };
  }

  const targetAliases = buildAliasSlugs(target);

  if (targetAliases.includes(normalizeSlug(source.slug))) {
    return {
      score: EXPLICIT_SOURCE_SLUG_MAP.has(normalizeSlug(target.slug)) ? 98 : 92,
      reason: EXPLICIT_SOURCE_SLUG_MAP.has(normalizeSlug(target.slug))
        ? "explicit_slug_alias"
        : "slug_alias",
    };
  }

  const similarity = computeTokenSimilarity(target, source);
  const samePrimaryMuscle =
    getPrimaryMuscleTokens(target.primaryMuscle) !== "" &&
    getPrimaryMuscleTokens(target.primaryMuscle) === getPrimaryMuscleTokens(source.primaryMuscle);

  if (similarity.overlapCount >= 2 && similarity.score >= 0.8 && samePrimaryMuscle) {
    return { score: 86, reason: "name_similarity_primary_match" };
  }

  if (
    similarity.overlapCount >= 3 &&
    similarity.score >= 0.85 &&
    normalizeText(target.equipment) === normalizeText(source.equipment)
  ) {
    return { score: 84, reason: "name_similarity_equipment_match" };
  }

  return null;
}

export async function loadFreeExerciseDbMediaSources() {
  return (await prisma.exercise.findMany({
    where: {
      externalSource: EXTERNAL_SOURCE,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      primaryMuscle: true,
      equipment: true,
      externalSource: true,
      imageUrls: true,
      tags: true,
    },
    orderBy: {
      id: "asc",
    },
  })).filter((exercise) => hasImages(exercise.imageUrls));
}

export function findFreeExerciseDbMediaMatch(target, sourceExercises) {
  const indexes = buildSourceIndexes(sourceExercises);
  const aliasSlugs = buildAliasSlugs(target);
  const directCandidates = new Map();

  for (const alias of aliasSlugs) {
    for (const candidate of indexes.bySlug.get(alias) ?? []) {
      directCandidates.set(candidate.id, candidate);
    }
  }

  for (const candidate of indexes.byName.get(normalizeText(target.name)) ?? []) {
    directCandidates.set(candidate.id, candidate);
  }

  const candidatePool =
    directCandidates.size > 0 ? [...directCandidates.values()] : sourceExercises;
  const isCardio = getMovementBucket(target) === "cardio";
  const cardioKeywords = isCardio ? getCardioKeywords(target) : [];

  let bestMatch = null;

  for (const source of candidatePool) {
    if (source.id === target.exerciseId) {
      continue;
    }

    const ranking = isCardio
      ? rankCardioCandidate(target, source, cardioKeywords)
      : rankStrengthLikeCandidate(target, source);

    if (!ranking) {
      continue;
    }

    if (!bestMatch || ranking.score > bestMatch.score) {
      bestMatch = {
        ...ranking,
        source,
      };
    }
  }

  return bestMatch;
}
