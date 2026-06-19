const INSTRUCTIONS_FALLBACK =
  "Istruzioni dettagliate non ancora disponibili. Esegui l'esercizio con controllo e tecnica pulita.";

type JsonObject = Record<string, unknown>;

export type ExerciseDisplayInput = {
  name?: unknown;
  instructions?: unknown;
  primaryMuscle?: unknown;
  primaryMuscles?: unknown;
  secondaryMuscles?: unknown;
  equipment?: unknown;
  difficulty?: unknown;
  category?: unknown;
  sourceMetadata?: unknown;
  needsTranslation?: unknown;
};

export type ExerciseDisplayData = {
  name: string;
  instructions: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: string | null;
  category: string | null;
  needsTranslationReview: boolean;
};

const MUSCLE_LABELS = new Map<string, string>([
  ["chest", "petto"],
  ["upper chest", "petto alto"],
  ["back", "dorso"],
  ["lats", "gran dorsale"],
  ["traps", "trapezi"],
  ["shoulders", "spalle"],
  ["lateral delts", "deltoidi laterali"],
  ["rear delts", "deltoidi posteriori"],
  ["biceps", "bicipiti"],
  ["triceps", "tricipiti"],
  ["quads", "quadricipiti"],
  ["quadriceps", "quadricipiti"],
  ["hamstrings", "femorali"],
  ["glutes", "glutei"],
  ["calves", "polpacci"],
  ["abs core", "core/addome"],
  ["abs", "core/addome"],
  ["core", "core/addome"],
  ["abdominals", "core/addome"],
  ["forearms", "avambracci"],
]);

const EQUIPMENT_LABELS = new Map<string, string>([
  ["bodyweight", "corpo libero"],
  ["body weight", "corpo libero"],
  ["body only", "corpo libero"],
  ["dumbbell", "manubri"],
  ["dumbbells", "manubri"],
  ["barbell", "bilanciere"],
  ["machine", "macchina"],
  ["cable", "cavi"],
  ["cables", "cavi"],
  ["resistance band", "elastico"],
  ["resistance bands", "elastico"],
  ["band", "elastico"],
  ["bands", "elastico"],
  ["kettlebell", "kettlebell"],
  ["kettlebells", "kettlebell"],
  ["bench", "panca"],
  ["treadmill", "tapis roulant"],
  ["bike", "cyclette/bike"],
  ["cycle", "cyclette/bike"],
  ["stationary bike", "cyclette/bike"],
  ["rower", "vogatore"],
  ["rowing machine", "vogatore"],
  ["stair climber", "stair climber"],
  ["trx", "trx/anelli"],
  ["trx rings", "trx/anelli"],
  ["rings", "trx/anelli"],
  ["gymnastic rings", "trx/anelli"],
]);

const DIFFICULTY_LABELS = new Map<string, string>([
  ["beginner", "principiante"],
  ["intermediate", "intermedio"],
  ["advanced", "avanzato"],
  ["expert", "esperto"],
  ["base", "principiante"],
  ["intermedia", "intermedio"],
  ["intermedio", "intermedio"],
  ["avanzata", "avanzato"],
  ["avanzato", "avanzato"],
]);

const CATEGORY_LABELS = new Map<string, string>([
  ["strength", "forza/ipertrofia"],
  ["cardio", "cardio"],
  ["mobility", "mobilita"],
  ["core", "core"],
  ["conditioning", "conditioning"],
  ["prehab", "prevenzione/controllo"],
]);

const DISPLAY_NAME_OVERRIDES = new Map<string, string>([
  ["seated cable rows", "Rematore al cavo seduto"],
  ["seated cable row", "Rematore al cavo seduto"],
  ["side lateral raise", "Alzate laterali"],
  ["side lateral raises", "Alzate laterali"],
  ["standing calf raises", "Calf raise in piedi"],
  ["standing calf raise", "Calf raise in piedi"],
  ["dumbbell bench press", "Panca piana con manubri"],
  ["incline dumbbell press", "Panca inclinata con manubri"],
  ["incline barbell press", "Panca inclinata con bilanciere"],
  ["barbell bench press", "Panca piana con bilanciere"],
  ["dumbbell row", "Rematore con manubrio"],
  ["one arm dumbbell row", "Rematore con manubrio a un braccio"],
  ["bent over barbell row", "Rematore bilanciere"],
  ["lat pulldown", "Lat machine"],
  ["pull up", "Trazioni alla sbarra"],
  ["push up", "Push-up"],
  ["push ups", "Push-up"],
  ["dips", "Dip alle parallele"],
  ["romanian deadlift", "Romanian deadlift"],
  ["romanian deadlift dumbbell", "Romanian deadlift con manubri"],
  ["romanian deadlift barbell", "Romanian deadlift con bilanciere"],
  ["shoulder press dumbbell", "Shoulder press con manubri"],
  ["shoulder press machine", "Shoulder press macchina"],
  ["bike zone 2", "Bike Zone 2"],
]);

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toWords(value: string) {
  return normalizeWhitespace(
    value
      .replace(/[_]+/g, " ")
      .replace(/\s+-\s+/g, " ")
      .replace(/(?<=\p{L})-(?=\p{L})/gu, " ")
  );
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();

  if (!trimmed || !/^[\[{]/.test(trimmed)) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function splitDelimitedString(value: string) {
  return value
    .split(/[;,]|(?:\s{2,})/)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
}

function flattenStringValues(
  value: unknown,
  options: {
    splitDelimited?: boolean;
  } = {}
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenStringValues(item, options));
  }

  if (typeof value === "string") {
    const parsed = parseJsonString(value);

    if (parsed !== value) {
      return flattenStringValues(parsed, options);
    }

    const normalized = normalizeWhitespace(value);

    if (!normalized) {
      return [];
    }

    return options.splitDelimited === false ? [normalized] : splitDelimitedString(normalized);
  }

  if (isPlainObject(value)) {
    const candidateKeys = ["instructions", "steps", "items", "list"];

    for (const key of candidateKeys) {
      if (key in value) {
        const extracted = flattenStringValues(value[key], options);

        if (extracted.length > 0) {
          return extracted;
        }
      }
    }
  }

  return [];
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}

function normalizeLabel(value: string, labels: Map<string, string>) {
  const direct = labels.get(toSlug(value));

  if (direct) {
    return direct;
  }

  return normalizeWhitespace(value);
}

function formatTitleWord(word: string) {
  if (/^[A-Z0-9]{2,}$/.test(word)) {
    return word;
  }

  if (/^(trx|hiit|emom|amrap)$/i.test(word)) {
    return word.toUpperCase();
  }

  if (/^[A-Za-z]$/.test(word)) {
    return word.toUpperCase();
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function formatDisplayNameFallback(value: string) {
  if (!value) {
    return "Esercizio";
  }

  if (value !== value.toLowerCase() && value !== value.toUpperCase()) {
    return value;
  }

  return value
    .split(" ")
    .map((word) => formatTitleWord(word))
    .join(" ");
}

function cleanInstructionStep(value: string) {
  return normalizeWhitespace(
    value
      .replace(/^[\s>*•·●▪◦\-–—]+/, "")
      .replace(/^(?:step|fase)\s*\d+[:.)-]?\s*/i, "")
      .replace(/^\d+\s*[:.)-]\s*/, "")
      .replace(/\s*([:;,.!?])\s*/g, "$1 ")
  );
}

function splitInstructionText(value: string) {
  const normalized = value.replace(/\r/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const lineItems = normalized
    .split(/\n+/)
    .map((item) => cleanInstructionStep(item))
    .filter(Boolean);

  if (lineItems.length > 1) {
    return lineItems;
  }

  const numberedItems = normalized
    .split(/(?=\s*\d+\s*[:.)-]\s*)/)
    .map((item) => cleanInstructionStep(item))
    .filter(Boolean);

  if (numberedItems.length > 1) {
    return numberedItems;
  }

  const sentenceItems = normalized
    .split(/(?<=[.!?;])\s+(?=[A-ZÀ-ÖØ-Ý0-9])/)
    .map((item) => cleanInstructionStep(item))
    .filter(Boolean);

  return sentenceItems.length > 1 ? sentenceItems : [cleanInstructionStep(normalized)];
}

function trimInstructionLength(value: string) {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= 260) {
    return normalized;
  }

  return `${normalized.slice(0, 257).trimEnd()}...`;
}

function readNeedsTranslation(value: unknown) {
  if (value === true) {
    return true;
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return value.needsTranslation === true;
}

export function getExerciseDisplayName(exercise: Pick<ExerciseDisplayInput, "name">) {
  const cleanedName = toWords(normalizeString(exercise.name));
  const mappedName = DISPLAY_NAME_OVERRIDES.get(toSlug(cleanedName));

  if (mappedName) {
    return mappedName;
  }

  return formatDisplayNameFallback(cleanedName);
}

export function getExerciseInstructionsForDisplay(
  exercise: Pick<ExerciseDisplayInput, "instructions" | "sourceMetadata" | "needsTranslation">
) {
  const items = flattenStringValues(exercise.instructions, { splitDelimited: false }).flatMap(
    (item) =>
    splitInstructionText(item)
  );
  const instructions = dedupe(items.map((item) => trimInstructionLength(item)).filter(Boolean));

  return {
    instructions: instructions.length > 0 ? instructions.slice(0, 8) : [INSTRUCTIONS_FALLBACK],
    needsTranslationReview:
      readNeedsTranslation(exercise.needsTranslation) ||
      readNeedsTranslation(exercise.sourceMetadata),
  };
}

export function getExerciseMusclesForDisplay(
  exercise: Pick<
    ExerciseDisplayInput,
    "primaryMuscle" | "primaryMuscles" | "secondaryMuscles"
  >
) {
  const primaryRaw = [
    ...flattenStringValues(exercise.primaryMuscles),
    ...flattenStringValues(exercise.primaryMuscle),
  ];
  const secondaryRaw = flattenStringValues(exercise.secondaryMuscles);

  return {
    primaryMuscles: dedupe(primaryRaw.map((item) => normalizeLabel(item, MUSCLE_LABELS)).filter(Boolean)),
    secondaryMuscles: dedupe(
      secondaryRaw.map((item) => normalizeLabel(item, MUSCLE_LABELS)).filter(Boolean)
    ),
  };
}

export function getExerciseEquipmentForDisplay(
  exercise: Pick<ExerciseDisplayInput, "equipment">
) {
  return dedupe(
    flattenStringValues(exercise.equipment)
      .map((item) => normalizeLabel(item, EQUIPMENT_LABELS))
      .filter(Boolean)
  );
}

export function getExerciseDifficultyForDisplay(
  exercise: Pick<ExerciseDisplayInput, "difficulty">
) {
  const difficulty = normalizeString(exercise.difficulty);

  return difficulty ? normalizeLabel(difficulty, DIFFICULTY_LABELS) : null;
}

export function getExerciseCategoryForDisplay(
  exercise: Pick<ExerciseDisplayInput, "category">
) {
  const category = normalizeString(exercise.category);

  return category ? normalizeLabel(category, CATEGORY_LABELS) : null;
}

export function getExerciseDisplayData(exercise: ExerciseDisplayInput): ExerciseDisplayData {
  const instructionData = getExerciseInstructionsForDisplay(exercise);
  const muscleData = getExerciseMusclesForDisplay(exercise);

  return {
    name: getExerciseDisplayName(exercise),
    instructions: instructionData.instructions,
    primaryMuscles: muscleData.primaryMuscles,
    secondaryMuscles: muscleData.secondaryMuscles,
    equipment: getExerciseEquipmentForDisplay(exercise),
    difficulty: getExerciseDifficultyForDisplay(exercise),
    category: getExerciseCategoryForDisplay(exercise),
    needsTranslationReview: instructionData.needsTranslationReview,
  };
}
