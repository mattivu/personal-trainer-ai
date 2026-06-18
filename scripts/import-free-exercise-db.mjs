import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATASET_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const EXTERNAL_SOURCE = "free_exercise_db";
const PENDING_ENVIRONMENT = "external_import_pending";
const DEFAULT_LIMIT = 50;

const EQUIPMENT_MAP = new Map([
  ["body only", "corpo libero"],
  ["body_only", "corpo libero"],
  ["machine", "macchina"],
  ["leverage machine", "macchina"],
  ["cable", "cavi"],
  ["dumbbell", "manubri"],
  ["barbell", "bilanciere"],
  ["bands", "elastico"],
  ["band", "elastico"],
  ["kettlebells", "kettlebell"],
  ["kettlebell", "kettlebell"],
  ["e-z curl bar", "bilanciere ez"],
  ["exercise ball", "fitball"],
  ["medicine ball", "medball"],
  ["foam roll", "foam roller"],
  ["foam roller", "foam roller"],
  ["other", "altro"],
]);

const MUSCLE_MAP = new Map([
  ["abdominals", "addome"],
  ["abductors", "abduttori"],
  ["adductors", "adduttori"],
  ["biceps", "bicipiti"],
  ["calves", "polpacci"],
  ["chest", "petto"],
  ["forearms", "avambracci"],
  ["glutes", "glutei"],
  ["hamstrings", "femorali"],
  ["hip flexors", "flessori anca"],
  ["lats", "dorsali"],
  ["lower back", "lombari"],
  ["middle back", "dorso medio"],
  ["neck", "collo"],
  ["quadriceps", "quadricipiti"],
  ["shoulders", "spalle"],
  ["traps", "trapezi"],
  ["triceps", "tricipiti"],
]);

const CATEGORY_MAP = new Map([
  ["cardio", "cardio"],
  ["olympic weightlifting", "strength"],
  ["plyometrics", "cardio"],
  ["powerlifting", "strength"],
  ["strength", "strength"],
  ["stretching", "mobility"],
  ["strongman", "strength"],
]);

function parseArgs(argv) {
  let limit = DEFAULT_LIMIT;
  let importAll = false;

  for (const arg of argv) {
    if (arg === "--all") {
      importAll = true;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);

      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }

      limit = parsed;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    limit,
    importAll,
  };
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))];
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? uniqueStrings(value.map((item) => normalizeText(item)).filter(Boolean))
    : [];
}

function mapEquipment(value) {
  const normalized = slugify(value).replace(/-/g, " ");
  return EQUIPMENT_MAP.get(normalized) ?? (normalizeText(value) || null);
}

function mapMuscle(value) {
  const normalized = slugify(value).replace(/-/g, " ");
  return MUSCLE_MAP.get(normalized) ?? normalizeText(value).toLowerCase();
}

function mapCategory(value) {
  const normalized = slugify(value).replace(/-/g, " ");
  return CATEGORY_MAP.get(normalized) ?? "strength";
}

function mapDifficulty(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "beginner" || normalized === "intermediate" || normalized === "advanced") {
    return normalized;
  }

  return "beginner";
}

function buildImageUrls(images) {
  return normalizeArray(images).map((imagePath) => `${IMAGE_BASE_URL}${imagePath}`);
}

function buildTags(exercise) {
  const tags = [
    "external_import",
    EXTERNAL_SOURCE,
    exercise.force ? `force:${slugify(exercise.force)}` : null,
    exercise.mechanic ? `mechanic:${slugify(exercise.mechanic)}` : null,
    exercise.category ? `source_category:${slugify(exercise.category)}` : null,
  ];

  return uniqueStrings(tags.filter(Boolean));
}

function normalizeExerciseRecord(exercise) {
  const externalId = normalizeText(exercise.id);
  const name = normalizeText(exercise.name);
  const slug = slugify(externalId || name);
  const primaryMuscles = normalizeArray(exercise.primaryMuscles).map(mapMuscle);
  const secondaryMuscles = normalizeArray(exercise.secondaryMuscles).map(mapMuscle);
  const imageUrls = buildImageUrls(exercise.images);
  const instructionSteps = normalizeArray(exercise.instructions);

  return {
    externalId,
    name,
    slug,
    category: mapCategory(exercise.category),
    primaryMuscle: primaryMuscles[0] ?? "non specificato",
    secondaryMuscles,
    equipment: mapEquipment(exercise.equipment),
    difficulty: mapDifficulty(exercise.level),
    movementPattern: null,
    environments: [PENDING_ENVIRONMENT],
    tags: buildTags(exercise),
    alternatives: [],
    instructions: instructionSteps.length > 0 ? instructionSteps.join("\n\n") : null,
    contraindications: [],
    imageUrls,
    sourceMetadata: {
      sourceImageBaseUrl: IMAGE_BASE_URL,
      rawCategory: exercise.category ?? null,
      rawEquipment: exercise.equipment ?? null,
      rawForce: exercise.force ?? null,
      rawImages: normalizeArray(exercise.images),
      rawInstructionsCount: instructionSteps.length,
      rawLevel: exercise.level ?? null,
      rawMechanic: exercise.mechanic ?? null,
      rawPrimaryMuscles: normalizeArray(exercise.primaryMuscles),
      rawSecondaryMuscles: normalizeArray(exercise.secondaryMuscles),
    },
  };
}

async function fetchDataset() {
  const response = await fetch(DATASET_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error("Dataset payload is not an array");
  }

  return payload;
}

async function main() {
  const { limit, importAll } = parseArgs(process.argv.slice(2));
  const dataset = await fetchDataset();
  const cappedDataset = importAll ? dataset : dataset.slice(0, limit);

  const existingExercises = await prisma.exercise.findMany({
    select: {
      id: true,
      slug: true,
      externalSource: true,
      externalId: true,
    },
  });

  const existingBySourceId = new Map();
  const existingBySlug = new Map();

  for (const exercise of existingExercises) {
    if (exercise.externalSource && exercise.externalId) {
      existingBySourceId.set(`${exercise.externalSource}:${exercise.externalId}`, exercise);
    }

    existingBySlug.set(exercise.slug, exercise);
  }

  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const rawExercise of cappedDataset) {
    try {
      const normalized = normalizeExerciseRecord(rawExercise);

      if (!normalized.externalId || !normalized.name || !normalized.slug) {
        summary.errors += 1;
        console.error("ERROR missing required normalized fields", {
          externalId: normalized.externalId,
          name: normalized.name,
          slug: normalized.slug,
        });
        continue;
      }

      const sourceKey = `${EXTERNAL_SOURCE}:${normalized.externalId}`;
      const existingExternal = existingBySourceId.get(sourceKey) ?? null;
      const slugMatch = existingBySlug.get(normalized.slug) ?? null;
      const slugOwnedByDifferentRecord =
        slugMatch &&
        (!existingExternal || slugMatch.id !== existingExternal.id) &&
        (slugMatch.externalSource !== EXTERNAL_SOURCE ||
          slugMatch.externalId !== normalized.externalId);

      if (slugOwnedByDifferentRecord) {
        summary.skipped += 1;
        console.warn(
          `WARN skipping ${normalized.externalId} because slug "${normalized.slug}" already belongs to record ${slugMatch.id}`
        );
        continue;
      }

      const payload = {
        name: normalized.name,
        slug: normalized.slug,
        category: normalized.category,
        primaryMuscle: normalized.primaryMuscle,
        secondaryMuscles: normalized.secondaryMuscles,
        equipment: normalized.equipment,
        difficulty: normalized.difficulty,
        movementPattern: normalized.movementPattern,
        environments: normalized.environments,
        tags: normalized.tags,
        alternatives: normalized.alternatives,
        instructions: normalized.instructions,
        contraindications: normalized.contraindications,
        externalSource: EXTERNAL_SOURCE,
        externalId: normalized.externalId,
        imageUrls: normalized.imageUrls,
        sourceMetadata: normalized.sourceMetadata,
        importedAt: new Date(),
      };

      if (existingExternal) {
        const previousSlug = existingExternal.slug;

        await prisma.exercise.update({
          where: { id: existingExternal.id },
          data: payload,
        });

        summary.updated += 1;
        existingBySlug.delete(previousSlug);
        existingBySourceId.set(sourceKey, {
          ...existingExternal,
          slug: normalized.slug,
          externalSource: EXTERNAL_SOURCE,
          externalId: normalized.externalId,
        });
        existingBySlug.set(normalized.slug, {
          ...existingExternal,
          slug: normalized.slug,
          externalSource: EXTERNAL_SOURCE,
          externalId: normalized.externalId,
        });
        continue;
      }

      const created = await prisma.exercise.create({
        data: payload,
        select: {
          id: true,
          slug: true,
          externalSource: true,
          externalId: true,
        },
      });

      summary.created += 1;
      existingBySourceId.set(sourceKey, created);
      existingBySlug.set(created.slug, created);
    } catch (error) {
      summary.errors += 1;
      console.error("ERROR importing exercise", {
        sourceId: rawExercise?.id ?? null,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("Import summary");
  console.log(`created: ${summary.created}`);
  console.log(`updated: ${summary.updated}`);
  console.log(`skipped: ${summary.skipped}`);
  console.log(`errors: ${summary.errors}`);
}

main()
  .catch((error) => {
    console.error("FREE_EXERCISE_DB_IMPORT_FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
