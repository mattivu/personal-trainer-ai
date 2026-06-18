import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXTERNAL_SOURCE = "free_exercise_db";
const REVIEW_ENVIRONMENT = "external_import_pending";
const ACTIVATED_BY = "activation_v1";

function normalizeText(value) {
  return typeof value === "string"
    ? value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").map(normalizeText).filter(Boolean)
    : [];
}

function normalizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildExerciseText(exercise, metadata) {
  return [
    exercise.name,
    exercise.category,
    exercise.equipment,
    metadata.rawEquipment,
    metadata.rawCategory,
    metadata.rawLevel,
    metadata.rawMechanic,
    metadata.questionnaireContext?.equipment,
    ...normalizeArray(exercise.tags),
    ...normalizeArray(metadata.reviewWarnings),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function isBodyweightEquipment(text) {
  return [
    "bodyweight",
    "body only",
    "body only",
    "corpo libero",
    "none",
    "no equipment",
    "senza attrezzatura",
  ].some((keyword) => text.includes(keyword));
}

function isHomeGymPortableEquipment(text) {
  return [
    "dumbbell",
    "manubri",
    "manubrio",
    "kettlebell",
    "band",
    "bands",
    "resistance band",
    "elastico",
  ].some((keyword) => text.includes(keyword));
}

function isGymOnlyEquipment(text) {
  return [
    "barbell",
    "bilanciere",
    "machine",
    "macchina",
    "cable",
    "cavi",
    "cavo",
    "smith",
    "leg press",
    "hack squat",
    "treadmill",
    "elliptical",
    "ellittica",
    "rowing machine",
    "rower",
  ].some((keyword) => text.includes(keyword));
}

function inferActivatedEnvironments(exercise, metadata) {
  const text = buildExerciseText(exercise, metadata);
  const category = normalizeText(exercise.category || metadata.rawCategory);

  if (isBodyweightEquipment(text)) {
    return ["home", "gym", "outdoor"];
  }

  if (isHomeGymPortableEquipment(text)) {
    return ["home", "gym"];
  }

  if (isGymOnlyEquipment(text)) {
    return ["gym"];
  }

  if (category === "cardio") {
    const outdoorCoherent = [
      "run",
      "running",
      "walk",
      "walking",
      "jog",
      "sprint",
      "stairs",
      "hiking",
      "jump rope",
      "rope",
      "bodyweight",
      "corpo libero",
    ].some((keyword) => text.includes(keyword));

    return outdoorCoherent ? ["gym", "outdoor"] : ["gym"];
  }

  return ["gym"];
}

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getActivationPlan(exercise) {
  const metadata = normalizeObject(exercise.sourceMetadata);
  const questionnaireContext = normalizeObject(metadata.questionnaireContext);
  const qualityStatus = metadata.qualityStatus;

  if (
    qualityStatus !== "usable_candidate" &&
    qualityStatus !== "specialized_equipment" &&
    qualityStatus !== "low_confidence" &&
    qualityStatus !== "missing_media" &&
    qualityStatus !== "pending_review"
  ) {
    return {
      type: "skipped",
      reason: "unknown_quality_status",
    };
  }

  if (qualityStatus === "usable_candidate") {
    const activatedAt =
      metadata.engineStatus === "active_candidate" && typeof metadata.activatedAt === "string"
        ? metadata.activatedAt
        : new Date().toISOString();
    const environments = inferActivatedEnvironments(exercise, {
      ...metadata,
      questionnaireContext,
    });

    return {
      type: "active_candidate",
      environments,
      sourceMetadata: {
        ...metadata,
        questionnaireContext: {
          ...questionnaireContext,
          environments,
        },
        engineStatus: "active_candidate",
        activatedAt,
        activatedBy: ACTIVATED_BY,
        activationWarning:
          "Attivato in v1 come candidato importato: resta filtrato da profilo, ambiente, attrezzatura e limitazioni.",
      },
    };
  }

  if (qualityStatus === "specialized_equipment") {
    const activatedAt =
      metadata.engineStatus === "conditional_candidate" &&
      typeof metadata.activatedAt === "string"
        ? metadata.activatedAt
        : new Date().toISOString();
    const environments = inferActivatedEnvironments(exercise, {
      ...metadata,
      questionnaireContext,
    });

    return {
      type: "conditional_candidate",
      environments,
      sourceMetadata: {
        ...metadata,
        questionnaireContext: {
          ...questionnaireContext,
          environments,
          specialistWarning: true,
        },
        engineStatus: "conditional_candidate",
        activatedAt,
        activatedBy: ACTIVATED_BY,
        activationWarning:
          "Candidato condizionale v1: richiede contesto esplicito dal questionario per entrare nel motore o nello swap.",
      },
    };
  }

  return {
    type: "excluded_v1",
    environments: unique([
      ...normalizeArray(exercise.environments),
      REVIEW_ENVIRONMENT,
    ]),
    sourceMetadata: {
      ...metadata,
      questionnaireContext: {
        ...questionnaireContext,
      },
      engineStatus: "excluded_v1",
      activationWarning:
        "Escluso da Activation v1: non deve entrare nel motore o nello swap.",
    },
  };
}

async function main() {
  const exercises = await prisma.exercise.findMany({
    where: {
      externalSource: EXTERNAL_SOURCE,
    },
    select: {
      id: true,
      name: true,
      category: true,
      equipment: true,
      environments: true,
      tags: true,
      sourceMetadata: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const summary = {
    active_candidate: 0,
    conditional_candidate: 0,
    excluded_v1: 0,
    skipped: 0,
    errors: 0,
  };

  for (const exercise of exercises) {
    try {
      const plan = getActivationPlan(exercise);

      if (plan.type === "skipped") {
        summary.skipped += 1;
        continue;
      }

      const currentEnvironments = normalizeArray(exercise.environments);
      const nextEnvironments =
        plan.type === "excluded_v1"
          ? plan.environments
          : plan.environments.filter((environment) => environment !== REVIEW_ENVIRONMENT);
      const currentMetadata = normalizeObject(exercise.sourceMetadata);
      const nextMetadata = plan.sourceMetadata;
      const currentQuestionnaireContext = normalizeObject(currentMetadata.questionnaireContext);
      const nextQuestionnaireContext = normalizeObject(nextMetadata.questionnaireContext);

      const environmentsChanged = !arraysEqual(currentEnvironments, nextEnvironments);
      const metadataChanged =
        currentMetadata.engineStatus !== nextMetadata.engineStatus ||
        currentMetadata.activatedBy !== nextMetadata.activatedBy ||
        currentMetadata.activationWarning !== nextMetadata.activationWarning ||
        (plan.type !== "excluded_v1" &&
          (currentMetadata.activatedAt !== nextMetadata.activatedAt ||
            !arraysEqual(
              normalizeArray(currentQuestionnaireContext.environments),
              normalizeArray(nextQuestionnaireContext.environments)
            ) ||
            currentQuestionnaireContext.specialistWarning !==
              nextQuestionnaireContext.specialistWarning));

      if (!environmentsChanged && !metadataChanged) {
        summary.skipped += 1;
        continue;
      }

      await prisma.exercise.update({
        where: { id: exercise.id },
        data: {
          environments: nextEnvironments,
          sourceMetadata: nextMetadata,
        },
      });

      summary[plan.type] += 1;
    } catch (error) {
      summary.errors += 1;
      console.error("ACTIVATE_IMPORTED_EXERCISE_ERROR", {
        exerciseId: exercise.id,
        name: exercise.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("Activation summary");
  console.log(`active_candidate: ${summary.active_candidate}`);
  console.log(`conditional_candidate: ${summary.conditional_candidate}`);
  console.log(`excluded_v1: ${summary.excluded_v1}`);
  console.log(`skipped: ${summary.skipped}`);
  console.log(`errors: ${summary.errors}`);
}

main()
  .catch((error) => {
    console.error("ACTIVATE_IMPORTED_EXERCISES_FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
