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

const SPECIALIZED_KEYWORDS = [
  "climbing",
  "rock climbing",
  "rope climbing",
  "rope climb",
  "strongman",
  "sled",
  "tire",
  "atlas stone",
  "log press",
  "farmer walk",
  "farmers walk",
  "yoke",
  "snatch",
  "clean and jerk",
  "split jerk",
  "push jerk",
];

const SPECIALIZED_EQUIPMENT_KEYWORDS = [
  "rope",
  "tire",
  "sled",
  "stone",
  "log",
  "yoke",
  "harness",
  "peg board",
];

function parseArgs(argv) {
  let limit = DEFAULT_LIMIT;
  let importAll = false;
  let enrichMediaOnly = false;

  for (const arg of argv) {
    if (arg === "--all") {
      importAll = true;
      continue;
    }

    if (arg === "--enrich-media-only") {
      enrichMediaOnly = true;
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
    enrichMediaOnly,
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

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
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

function containsKeyword(value, keywords) {
  const normalized = slugify(value).replace(/-/g, " ");
  return keywords.some((keyword) => normalized.includes(keyword));
}

function inferQuestionnaireEnvironments(normalizedEquipment, mappedCategory) {
  if (!normalizedEquipment || normalizedEquipment === "corpo libero") {
    return ["casa", "palestra"];
  }

  if (
    ["manubri", "elastico", "kettlebell", "fitball", "medball", "foam roller"].includes(
      normalizedEquipment
    )
  ) {
    return ["casa", "palestra"];
  }

  if (["macchina", "cavi", "bilanciere", "bilanciere ez"].includes(normalizedEquipment)) {
    return ["palestra"];
  }

  if (mappedCategory === "cardio") {
    return ["casa", "palestra"];
  }

  return ["da_verificare"];
}

function assessQuality(exercise, normalized) {
  const rawCategory = normalizeText(exercise.category);
  const rawEquipment = normalizeText(exercise.equipment);
  const rawName = normalizeText(exercise.name);
  const sourceFingerprint = [rawName, rawCategory, rawEquipment, normalizeText(exercise.force)]
    .join(" ")
    .toLowerCase();
  const rawPrimaryMuscles = normalizeArray(exercise.primaryMuscles);
  const normalizedPrimarySource = slugify(rawPrimaryMuscles[0]).replace(/-/g, " ");
  const normalizedEquipmentSource = slugify(exercise.equipment).replace(/-/g, " ");
  const normalizedCategorySource = slugify(exercise.category).replace(/-/g, " ");
  const reviewWarnings = [];
  const hasMappedPrimaryMuscle =
    normalized.primaryMuscle !== "non specificato" && MUSCLE_MAP.has(normalizedPrimarySource);
  const hasClearEquipment =
    normalized.equipment !== null &&
    normalized.equipment !== "altro" &&
    EQUIPMENT_MAP.has(normalizedEquipmentSource);
  const hasSourceInstructions = Boolean(normalized.instructions);
  const hasImages = normalized.imageUrls.length > 0;
  const specializedByKeyword =
    containsKeyword(sourceFingerprint, SPECIALIZED_KEYWORDS) ||
    SPECIALIZED_EQUIPMENT_KEYWORDS.some((keyword) =>
      normalizedEquipmentSource.includes(keyword)
    ) ||
    normalizedCategorySource === "strongman";
  const specializedOlympic =
    normalizedCategorySource === "olympic weightlifting" &&
    containsKeyword(rawName, SPECIALIZED_KEYWORDS);
  const unclearCategory = !CATEGORY_MAP.has(normalizedCategorySource);
  const equipmentIsOther = normalizedEquipmentSource === "other";
  const equipmentUnmapped = Boolean(rawEquipment) && !EQUIPMENT_MAP.has(normalizedEquipmentSource);

  if (normalized.primaryMuscle === "non specificato") {
    reviewWarnings.push("Muscolo principale non mappato.");
  }

  if (!hasSourceInstructions) {
    reviewWarnings.push("Istruzioni sorgente mancanti.");
  }

  if (!hasImages) {
    reviewWarnings.push("Immagini mancanti.");
  }

  if (unclearCategory) {
    reviewWarnings.push("Categoria sorgente non chiaramente mappata.");
  }

  if (equipmentIsOther) {
    reviewWarnings.push('Attrezzatura sorgente impostata come "other".');
  } else if (equipmentUnmapped) {
    reviewWarnings.push("Attrezzatura sorgente non chiaramente mappata.");
  }

  if (specializedByKeyword || specializedOlympic) {
    reviewWarnings.push("Richiede attrezzatura o contesto specialistico.");
  }

  let qualityStatus = "pending_review";

  if (specializedByKeyword || specializedOlympic) {
    qualityStatus = "specialized_equipment";
  } else if (!hasMappedPrimaryMuscle || !hasClearEquipment || unclearCategory || !hasSourceInstructions) {
    qualityStatus = "low_confidence";
  } else if (!hasImages) {
    qualityStatus = "missing_media";
  } else if (hasMappedPrimaryMuscle && hasClearEquipment && hasSourceInstructions && hasImages) {
    qualityStatus = "usable_candidate";
  }

  return {
    needsTranslation: true,
    hasImages,
    imageCount: normalized.imageUrls.length,
    qualityStatus,
    reviewWarnings,
    questionnaireContext: {
      environments: inferQuestionnaireEnvironments(normalized.equipment, normalized.category),
      equipment: normalized.equipment,
      difficulty: normalized.difficulty,
      limitations: reviewWarnings,
      specialistWarning: qualityStatus === "specialized_equipment",
    },
  };
}

function normalizeExerciseRecord(exercise) {
  const externalId = normalizeText(exercise.id);
  const name = normalizeText(exercise.name);
  const slug = slugify(externalId || name);
  const primaryMuscles = normalizeArray(exercise.primaryMuscles).map(mapMuscle);
  const secondaryMuscles = normalizeArray(exercise.secondaryMuscles).map(mapMuscle);
  const imageUrls = buildImageUrls(exercise.images);
  const instructionSteps = normalizeArray(exercise.instructions);
  const category = mapCategory(exercise.category);
  const primaryMuscle = primaryMuscles[0] ?? "non specificato";
  const equipment = mapEquipment(exercise.equipment);
  const difficulty = mapDifficulty(exercise.level);
  const instructions = instructionSteps.length > 0 ? instructionSteps.join("\n\n") : null;
  const quality = assessQuality(exercise, {
    primaryMuscle,
    equipment,
    category,
    difficulty,
    instructions,
    imageUrls,
  });

  return {
    externalId,
    name,
    slug,
    category,
    primaryMuscle,
    secondaryMuscles,
    equipment,
    difficulty,
    movementPattern: null,
    environments: [PENDING_ENVIRONMENT],
    tags: buildTags(exercise),
    alternatives: [],
    instructions,
    contraindications: [],
    imageUrls,
    sourceMetadata: {
      ...quality,
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
  const { limit, importAll, enrichMediaOnly } = parseArgs(process.argv.slice(2));
  const dataset = await fetchDataset();
  const cappedDataset = enrichMediaOnly || importAll ? dataset : dataset.slice(0, limit);

  const existingExercises = await prisma.exercise.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrls: true,
      externalSource: true,
      externalId: true,
      sourceMetadata: true,
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
    enrichedInternal: 0,
    alreadyWithImages: 0,
    collisionsWithoutSourceImages: 0,
    withImages: 0,
    withoutImages: 0,
    usableCandidate: 0,
    specializedEquipment: 0,
    lowConfidence: 0,
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
      const slugCollisionWithInternal = slugOwnedByDifferentRecord && !slugMatch.externalSource;

      if (slugCollisionWithInternal) {
        const existingInternalImages = normalizeArray(slugMatch.imageUrls);

        if (existingInternalImages.length > 0) {
          summary.alreadyWithImages += 1;
          continue;
        }

        if (normalized.imageUrls.length === 0) {
          summary.collisionsWithoutSourceImages += 1;
          continue;
        }

        const mergedSourceMetadata = {
          ...normalizeObject(slugMatch.sourceMetadata),
          mediaEnrichment: {
            source: EXTERNAL_SOURCE,
            externalId: normalized.externalId,
            imageCount: normalized.imageUrls.length,
            enrichedAt: new Date().toISOString(),
            note: "Media importati da free-exercise-db senza modificare la logica interna dell'esercizio.",
          },
        };

        await prisma.exercise.update({
          where: { id: slugMatch.id },
          data: {
            imageUrls: normalized.imageUrls,
            sourceMetadata: mergedSourceMetadata,
          },
        });

        summary.enrichedInternal += 1;
        existingBySlug.set(slugMatch.slug, {
          ...slugMatch,
          imageUrls: normalized.imageUrls,
          sourceMetadata: mergedSourceMetadata,
        });
        continue;
      }

      if (slugOwnedByDifferentRecord) {
        summary.skipped += 1;
        console.warn(
          `WARN skipping ${normalized.externalId} because slug "${normalized.slug}" already belongs to record ${slugMatch.id}`
        );
        continue;
      }

      if (enrichMediaOnly) {
        summary.skipped += 1;
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

      if (normalized.sourceMetadata.hasImages) {
        summary.withImages += 1;
      } else {
        summary.withoutImages += 1;
      }

      if (normalized.sourceMetadata.qualityStatus === "usable_candidate") {
        summary.usableCandidate += 1;
      }

      if (normalized.sourceMetadata.qualityStatus === "specialized_equipment") {
        summary.specializedEquipment += 1;
      }

      if (normalized.sourceMetadata.qualityStatus === "low_confidence") {
        summary.lowConfidence += 1;
      }

      if (existingExternal) {
        const previousSlug = existingExternal.slug;
        const mergedSourceMetadata = {
          ...normalizeObject(existingExternal.sourceMetadata),
          ...payload.sourceMetadata,
        };

        await prisma.exercise.update({
          where: { id: existingExternal.id },
          data: {
            ...payload,
            sourceMetadata: mergedSourceMetadata,
          },
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

  if (enrichMediaOnly) {
    console.log("Exercise media enrichment summary");
    console.log(`interni arricchiti: ${summary.enrichedInternal}`);
    console.log(`gia con immagini: ${summary.alreadyWithImages}`);
    console.log(`collisioni senza immagini sorgente: ${summary.collisionsWithoutSourceImages}`);
    console.log(`saltati: ${summary.skipped}`);
    console.log(`errori: ${summary.errors}`);
    return;
  }

  console.log("Import summary");
  console.log(`created: ${summary.created}`);
  console.log(`updated: ${summary.updated}`);
  console.log(`enriched_internal: ${summary.enrichedInternal}`);
  console.log(`already_with_images: ${summary.alreadyWithImages}`);
  console.log(`collisions_without_source_images: ${summary.collisionsWithoutSourceImages}`);
  console.log(`skipped: ${summary.skipped}`);
  console.log(`errors: ${summary.errors}`);
  console.log(`con immagini: ${summary.withImages}`);
  console.log(`senza immagini: ${summary.withoutImages}`);
  console.log(`usable_candidate: ${summary.usableCandidate}`);
  console.log(`specialized_equipment: ${summary.specializedEquipment}`);
  console.log(`low_confidence: ${summary.lowConfidence}`);
}

main()
  .catch((error) => {
    console.error("FREE_EXERCISE_DB_IMPORT_FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
