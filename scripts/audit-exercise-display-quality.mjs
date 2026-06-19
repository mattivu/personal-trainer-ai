import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TOP_LIMIT = 20;

const ENGLISH_NAME_HINTS = [
  "bench",
  "press",
  "row",
  "raise",
  "curl",
  "push",
  "pull",
  "squat",
  "deadlift",
  "fly",
  "bike",
  "treadmill",
  "dumbbell",
  "barbell",
  "cable",
  "machine",
  "seated",
  "standing",
  "incline",
  "decline",
  "zone",
];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseNeedsTranslation(sourceMetadata) {
  const metadata = normalizeObject(sourceMetadata);
  return metadata?.needsTranslation === true;
}

function looksEnglishName(name) {
  const normalized = slugify(name);

  if (!normalized) {
    return false;
  }

  if (normalizeText(name).includes("_")) {
    return true;
  }

  return ENGLISH_NAME_HINTS.some((hint) => normalized.includes(hint));
}

function hasMissingInstructions(instructions) {
  return normalizeText(instructions).length === 0;
}

function hasDisplayOpportunity(exercise) {
  return (
    parseNeedsTranslation(exercise.sourceMetadata) ||
    hasMissingInstructions(exercise.instructions) ||
    looksEnglishName(exercise.name)
  );
}

function sortByUsage(records) {
  return [...records].sort((left, right) => {
    if (right.usageCount !== left.usageCount) {
      return right.usageCount - left.usageCount;
    }

    return left.name.localeCompare(right.name, "it");
  });
}

function printSection(title, exercises) {
  console.log(`\n${title}`);

  if (exercises.length === 0) {
    console.log("- nessun esercizio");
    return;
  }

  exercises.forEach((exercise, index) => {
    const details = [
      `id=${exercise.id}`,
      `uso=${exercise.usageCount}`,
      exercise.externalSource ? `fonte=${exercise.externalSource}` : "fonte=interno",
    ];

    if (exercise.sourceMetadata?.qualityStatus) {
      details.push(`quality=${exercise.sourceMetadata.qualityStatus}`);
    }

    console.log(
      `${index + 1}. ${exercise.name} (${details.join(", ")})`
    );
  });
}

async function main() {
  const [exerciseRecords, usageCounts] = await Promise.all([
    prisma.exercise.findMany({
      select: {
        id: true,
        name: true,
        instructions: true,
        externalSource: true,
        sourceMetadata: true,
      },
    }),
    prisma.programExercise.groupBy({
      by: ["exerciseId"],
      where: {
        exerciseId: {
          not: null,
        },
        isActive: true,
      },
      _count: {
        exerciseId: true,
      },
    }),
  ]);

  const usageByExerciseId = new Map(
    usageCounts
      .filter((entry) => entry.exerciseId !== null)
      .map((entry) => [entry.exerciseId, entry._count.exerciseId])
  );

  const exercises = exerciseRecords.map((exercise) => ({
    ...exercise,
    usageCount: usageByExerciseId.get(exercise.id) ?? 0,
    sourceMetadata: normalizeObject(exercise.sourceMetadata),
  }));

  const needsTranslation = sortByUsage(
    exercises.filter((exercise) => parseNeedsTranslation(exercise.sourceMetadata))
  ).slice(0, TOP_LIMIT);

  const withoutInstructions = sortByUsage(
    exercises.filter((exercise) => hasMissingInstructions(exercise.instructions))
  ).slice(0, TOP_LIMIT);

  const englishNames = sortByUsage(
    exercises.filter((exercise) => looksEnglishName(exercise.name))
  ).slice(0, TOP_LIMIT);

  const improvable = sortByUsage(
    exercises.filter((exercise) => hasDisplayOpportunity(exercise))
  ).slice(0, TOP_LIMIT);

  console.log("Exercise display quality audit");
  console.log(`totale esercizi analizzati: ${exercises.length}`);
  console.log(
    `esercizi con needsTranslation: ${
      exercises.filter((exercise) => parseNeedsTranslation(exercise.sourceMetadata)).length
    }`
  );
  console.log(
    `esercizi senza istruzioni: ${
      exercises.filter((exercise) => hasMissingInstructions(exercise.instructions)).length
    }`
  );
  console.log(
    `esercizi con nome probabilmente inglese: ${
      exercises.filter((exercise) => looksEnglishName(exercise.name)).length
    }`
  );

  printSection(
    `Top ${Math.min(TOP_LIMIT, needsTranslation.length)} esercizi usati con needsTranslation`,
    needsTranslation
  );
  printSection(
    `Top ${Math.min(TOP_LIMIT, withoutInstructions.length)} esercizi usati senza istruzioni`,
    withoutInstructions
  );
  printSection(
    `Top ${Math.min(TOP_LIMIT, englishNames.length)} esercizi con nome probabilmente inglese`,
    englishNames
  );
  printSection(
    `Top ${Math.min(TOP_LIMIT, improvable.length)} esercizi usati con display migliorabile`,
    improvable
  );
}

main()
  .catch((error) => {
    console.error("AUDIT_EXERCISE_DISPLAY_QUALITY_ERROR", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
