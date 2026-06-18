"use server";

import { prisma } from "@/lib/prisma";

const REVIEW_ENVIRONMENT = "external_import_pending";
const PAGE_SIZE = 25;

export type ExerciseLibrarySourceFilter = "all" | "internal" | "free_exercise_db";
export type ExerciseLibraryStatusFilter = "all" | "pending" | "active";

type SearchParamsValue = string | string[] | undefined;

type ExerciseSummaryRecord = {
  externalSource: string | null;
  environments: unknown;
  imageUrls: unknown;
  sourceMetadata: unknown;
};

type ExerciseLibraryRecord = {
  id: number;
  name: string;
  category: string;
  primaryMuscle: string;
  secondaryMuscles: unknown;
  equipment: string | null;
  difficulty: string | null;
  environments: unknown;
  instructions: string | null;
  externalSource: string | null;
  externalId: string | null;
  imageUrls: unknown;
  sourceMetadata: unknown;
};

type ExerciseSourceMetadata = {
  mediaEnrichment?: {
    source?: string;
    externalId?: string;
    imageCount?: number;
    enrichedAt?: string;
    note?: string;
  };
  needsTranslation?: boolean;
  hasImages?: boolean;
  imageCount?: number;
  qualityStatus?:
    | "pending_review"
    | "usable_candidate"
    | "specialized_equipment"
    | "missing_media"
    | "low_confidence";
  reviewWarnings?: string[];
  sourceImageBaseUrl?: string;
  rawCategory?: string | null;
  rawEquipment?: string | null;
  rawForce?: string | null;
  rawImages?: string[];
  rawInstructionsCount?: number;
  rawLevel?: string | null;
  rawMechanic?: string | null;
  rawPrimaryMuscles?: string[];
  rawSecondaryMuscles?: string[];
  questionnaireContext?: {
    environments?: string[];
    equipment?: string | null;
    difficulty?: string | null;
    limitations?: string[];
    specialistWarning?: boolean;
  };
};

export type ExerciseLibraryItem = {
  id: number;
  name: string;
  category: string;
  difficulty: string | null;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string | null;
  environments: string[];
  instructionsPreview: string;
  sourceLabel: string;
  externalSource: string | null;
  externalId: string | null;
  reviewStatusLabel: string;
  imageUrls: string[];
  qualityStatusLabel: string | null;
  reviewWarnings: string[];
  hasImages: boolean;
  hasMediaEnrichment: boolean;
  sourceMetadata: ExerciseSourceMetadata | null;
  originalInstructions: string | null;
};

export type ExerciseLibraryFilters = {
  source: ExerciseLibrarySourceFilter;
  status: ExerciseLibraryStatusFilter;
  search: string;
  muscle: string;
  equipment: string;
  page: number;
};

export type ExerciseLibraryResult = {
  counts: {
    total: number;
    internal: number;
    imported: number;
    pending: number;
    importedWithImages: number;
    importedWithoutImages: number;
    specializedOrReview: number;
  };
  filters: ExerciseLibraryFilters;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  exercises: ExerciseLibraryItem[];
};

function getSingleValue(value: SearchParamsValue) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeString(value: SearchParamsValue) {
  return getSingleValue(value)?.trim() ?? "";
}

function normalizeArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseSourceMetadata(value: unknown): ExerciseSourceMetadata | null {
  const metadata = normalizeObject(value);

  if (!metadata) {
    return null;
  }

  const questionnaireContext = normalizeObject(metadata.questionnaireContext);
  const mediaEnrichment = normalizeObject(metadata.mediaEnrichment);

  return {
    mediaEnrichment: mediaEnrichment
      ? {
          source: typeof mediaEnrichment.source === "string" ? mediaEnrichment.source : undefined,
          externalId:
            typeof mediaEnrichment.externalId === "string"
              ? mediaEnrichment.externalId
              : undefined,
          imageCount:
            typeof mediaEnrichment.imageCount === "number" &&
            Number.isFinite(mediaEnrichment.imageCount)
              ? mediaEnrichment.imageCount
              : undefined,
          enrichedAt:
            typeof mediaEnrichment.enrichedAt === "string"
              ? mediaEnrichment.enrichedAt
              : undefined,
          note: typeof mediaEnrichment.note === "string" ? mediaEnrichment.note : undefined,
        }
      : undefined,
    needsTranslation: metadata.needsTranslation === true,
    hasImages: metadata.hasImages === true,
    imageCount:
      typeof metadata.imageCount === "number" && Number.isFinite(metadata.imageCount)
        ? metadata.imageCount
        : undefined,
    qualityStatus:
      metadata.qualityStatus === "pending_review" ||
      metadata.qualityStatus === "usable_candidate" ||
      metadata.qualityStatus === "specialized_equipment" ||
      metadata.qualityStatus === "missing_media" ||
      metadata.qualityStatus === "low_confidence"
        ? metadata.qualityStatus
        : undefined,
    reviewWarnings: normalizeArray(metadata.reviewWarnings),
    sourceImageBaseUrl:
      typeof metadata.sourceImageBaseUrl === "string" ? metadata.sourceImageBaseUrl : undefined,
    rawCategory: typeof metadata.rawCategory === "string" ? metadata.rawCategory : null,
    rawEquipment: typeof metadata.rawEquipment === "string" ? metadata.rawEquipment : null,
    rawForce: typeof metadata.rawForce === "string" ? metadata.rawForce : null,
    rawImages: normalizeArray(metadata.rawImages),
    rawInstructionsCount:
      typeof metadata.rawInstructionsCount === "number" &&
      Number.isFinite(metadata.rawInstructionsCount)
        ? metadata.rawInstructionsCount
        : undefined,
    rawLevel: typeof metadata.rawLevel === "string" ? metadata.rawLevel : null,
    rawMechanic: typeof metadata.rawMechanic === "string" ? metadata.rawMechanic : null,
    rawPrimaryMuscles: normalizeArray(metadata.rawPrimaryMuscles),
    rawSecondaryMuscles: normalizeArray(metadata.rawSecondaryMuscles),
    questionnaireContext: questionnaireContext
      ? {
          environments: normalizeArray(questionnaireContext.environments),
          equipment:
            typeof questionnaireContext.equipment === "string"
              ? questionnaireContext.equipment
              : null,
          difficulty:
            typeof questionnaireContext.difficulty === "string"
              ? questionnaireContext.difficulty
              : null,
          limitations: normalizeArray(questionnaireContext.limitations),
          specialistWarning: questionnaireContext.specialistWarning === true,
        }
      : undefined,
  };
}

function parseSourceFilter(value: SearchParamsValue): ExerciseLibrarySourceFilter {
  const normalized = normalizeString(value);

  if (normalized === "internal" || normalized === "free_exercise_db") {
    return normalized;
  }

  return "all";
}

function parseStatusFilter(value: SearchParamsValue): ExerciseLibraryStatusFilter {
  const normalized = normalizeString(value);

  if (normalized === "pending" || normalized === "active") {
    return normalized;
  }

  return "all";
}

function parsePage(value: SearchParamsValue) {
  const normalized = normalizeString(value);
  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 1;
  }

  return parsed;
}

function includesText(value: string | null | undefined, filterValue: string) {
  if (!filterValue) {
    return true;
  }

  return (value ?? "").toLowerCase().includes(filterValue.toLowerCase());
}

function isPendingExercise(record: ExerciseSummaryRecord) {
  return normalizeArray(record.environments).includes(REVIEW_ENVIRONMENT);
}

function getReviewStatus(record: ExerciseSummaryRecord) {
  if (!record.externalSource) {
    return "internal" as const;
  }

  if (isPendingExercise(record)) {
    return "pending" as const;
  }

  return "active" as const;
}

function formatReviewStatusLabel(status: ReturnType<typeof getReviewStatus>) {
  switch (status) {
    case "internal":
      return "Interno";
    case "pending":
      return "Importato in revisione";
    case "active":
      return "Importato attivo";
  }
}

function formatSourceLabel(source: string | null) {
  return source ?? "interno";
}

function formatQualityStatusLabel(
  qualityStatus: ExerciseSourceMetadata["qualityStatus"]
) {
  switch (qualityStatus) {
    case "usable_candidate":
      return "Candidato utilizzabile";
    case "specialized_equipment":
      return "Attrezzatura specialistica";
    case "missing_media":
      return "Media mancanti";
    case "low_confidence":
      return "Bassa confidenza";
    case "pending_review":
      return "Da revisionare";
    default:
      return null;
  }
}

function buildInstructionsPreview(instructions: string | null) {
  const normalized = (instructions ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Nessuna istruzione disponibile.";
  }

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 180).trimEnd()}...`;
}

function buildDisplayInstructions(
  record: Pick<ExerciseLibraryRecord, "instructions" | "externalSource" | "sourceMetadata">
) {
  const metadata = parseSourceMetadata(record.sourceMetadata);

  if (record.externalSource && (metadata?.needsTranslation ?? true)) {
    return "Istruzioni originali da tradurre/revisionare.";
  }

  return buildInstructionsPreview(record.instructions);
}

function matchesSourceFilter(
  record: ExerciseLibraryRecord,
  source: ExerciseLibrarySourceFilter
) {
  if (source === "all") {
    return true;
  }

  if (source === "internal") {
    return !record.externalSource;
  }

  return record.externalSource === "free_exercise_db";
}

function matchesStatusFilter(
  record: ExerciseLibraryRecord,
  status: ExerciseLibraryStatusFilter
) {
  if (status === "all") {
    return true;
  }

  const reviewStatus = getReviewStatus(record);

  if (status === "pending") {
    return reviewStatus === "pending";
  }

  return reviewStatus === "internal" || reviewStatus === "active";
}

function matchesSearchFilters(record: ExerciseLibraryRecord, filters: ExerciseLibraryFilters) {
  const secondaryMuscles = normalizeArray(record.secondaryMuscles);

  const matchesSearch =
    !filters.search ||
    [record.name, record.category, record.primaryMuscle, record.externalId ?? ""].some((value) =>
      includesText(value, filters.search)
    );

  const matchesMuscle =
    !filters.muscle ||
    includesText(record.primaryMuscle, filters.muscle) ||
    secondaryMuscles.some((muscle) => includesText(muscle, filters.muscle));

  const matchesEquipment = includesText(record.equipment, filters.equipment);

  return matchesSearch && matchesMuscle && matchesEquipment;
}

function parseFilters(searchParams?: Record<string, SearchParamsValue>): ExerciseLibraryFilters {
  return {
    source: parseSourceFilter(searchParams?.source),
    status: parseStatusFilter(searchParams?.status),
    search: normalizeString(searchParams?.search),
    muscle: normalizeString(searchParams?.muscle),
    equipment: normalizeString(searchParams?.equipment),
    page: parsePage(searchParams?.page),
  };
}

export async function getExerciseLibrary(
  searchParams?: Record<string, SearchParamsValue>
): Promise<ExerciseLibraryResult> {
  const filters = parseFilters(searchParams);

  const [summaryRecords, exerciseRecords] = await Promise.all([
    prisma.exercise.findMany({
      select: {
        externalSource: true,
        environments: true,
        imageUrls: true,
        sourceMetadata: true,
      },
    }),
    prisma.exercise.findMany({
      where: {
        ...(filters.search
          ? {
              OR: [
                {
                  name: {
                    contains: filters.search,
                  },
                },
                {
                  category: {
                    contains: filters.search,
                  },
                },
                {
                  primaryMuscle: {
                    contains: filters.search,
                  },
                },
                {
                  externalId: {
                    contains: filters.search,
                  },
                },
              ],
            }
          : {}),
        ...(filters.source === "internal"
          ? {
              externalSource: null,
            }
          : {}),
        ...(filters.source === "free_exercise_db"
          ? {
              externalSource: "free_exercise_db",
            }
          : {}),
        ...(filters.equipment
          ? {
              equipment: {
                contains: filters.equipment,
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        category: true,
        primaryMuscle: true,
        secondaryMuscles: true,
        equipment: true,
        difficulty: true,
        environments: true,
        instructions: true,
        externalSource: true,
        externalId: true,
        imageUrls: true,
        sourceMetadata: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const counts = summaryRecords.reduce(
    (summary, exercise) => {
      summary.total += 1;

      if (exercise.externalSource) {
        summary.imported += 1;
      } else {
        summary.internal += 1;
      }

      if (isPendingExercise(exercise)) {
        summary.pending += 1;
      }

      if (exercise.externalSource) {
        const metadata = parseSourceMetadata(exercise.sourceMetadata);
        const hasImages =
          metadata?.hasImages === true || normalizeArray(exercise.imageUrls).length > 0;

        if (hasImages) {
          summary.importedWithImages += 1;
        } else {
          summary.importedWithoutImages += 1;
        }

        if (
          metadata?.qualityStatus === "specialized_equipment" ||
          metadata?.qualityStatus === "low_confidence" ||
          metadata?.qualityStatus === "pending_review" ||
          metadata?.qualityStatus === "missing_media"
        ) {
          summary.specializedOrReview += 1;
        }
      }

      return summary;
    },
    {
      total: 0,
      internal: 0,
      imported: 0,
      pending: 0,
      importedWithImages: 0,
      importedWithoutImages: 0,
      specializedOrReview: 0,
    }
  );

  const filteredExercises = exerciseRecords.filter(
    (exercise) =>
      matchesSourceFilter(exercise, filters.source) &&
      matchesStatusFilter(exercise, filters.status) &&
      matchesSearchFilters(exercise, filters)
  );

  const totalItems = filteredExercises.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const exercises = filteredExercises
    .slice(startIndex, startIndex + PAGE_SIZE)
    .map((exercise) => {
      const reviewStatus = getReviewStatus(exercise);
      const sourceMetadata = parseSourceMetadata(exercise.sourceMetadata);

      return {
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        difficulty: exercise.difficulty,
        primaryMuscle: exercise.primaryMuscle,
        secondaryMuscles: normalizeArray(exercise.secondaryMuscles),
        equipment: exercise.equipment,
        environments: normalizeArray(exercise.environments),
        instructionsPreview: buildDisplayInstructions(exercise),
        sourceLabel: formatSourceLabel(exercise.externalSource),
        externalSource: exercise.externalSource,
        externalId: exercise.externalId,
        reviewStatusLabel: formatReviewStatusLabel(reviewStatus),
        imageUrls: normalizeArray(exercise.imageUrls).slice(0, 2),
        qualityStatusLabel: formatQualityStatusLabel(sourceMetadata?.qualityStatus),
        reviewWarnings: sourceMetadata?.reviewWarnings ?? [],
        hasImages:
          sourceMetadata?.hasImages === true || normalizeArray(exercise.imageUrls).length > 0,
        hasMediaEnrichment: sourceMetadata?.mediaEnrichment?.source === "free_exercise_db",
        sourceMetadata,
        originalInstructions: exercise.instructions,
      };
    });

  return {
    counts,
    filters: {
      ...filters,
      page: currentPage,
    },
    pagination: {
      currentPage,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
    },
    exercises,
  };
}
