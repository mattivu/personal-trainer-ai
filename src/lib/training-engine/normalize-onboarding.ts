import type {
  ExperienceLevel,
  NormalizedTrainingProfile,
  TrainingEnvironment,
  TrainingGoal,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

function valueToString(value: unknown) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }

  return null;
}

function getText(values: Array<string | null | undefined>) {
  return normalizeText(values.filter(Boolean).join(" "));
}

function includesAny(text: string, matches: string[]) {
  return matches.some((match) => text.includes(match));
}

function parseDaysPerWeek(value: string | null) {
  if (!value) {
    return 3;
  }

  const matchedNumber = value.match(/\d+/);

  if (!matchedNumber) {
    return 3;
  }

  const parsed = Number.parseInt(matchedNumber[0], 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 3;
  }

  return Math.min(parsed, 7);
}

function parseSessionMinutes(value: string | null) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return 60;
  }

  if (normalized.includes("oltre 75")) {
    return 90;
  }

  const numbers = normalized.match(/\d+/g);

  if (!numbers || numbers.length === 0) {
    return 60;
  }

  const parsed = numbers.map((entry) => Number.parseInt(entry, 10));
  const valid = parsed.filter((entry) => Number.isFinite(entry));

  if (valid.length === 0) {
    return 60;
  }

  return Math.round(valid.reduce((sum, entry) => sum + entry, 0) / valid.length);
}

function parseGoal(text: string): TrainingGoal {
  if (
    includesAny(text, [
      "aumentare massa muscolare",
      "massa muscolare",
      "massa",
      "ipertrof",
      "diventare enorme",
      "bulk",
    ])
  ) {
    return "hypertrophy";
  }

  if (
    includesAny(text, [
      "perdere peso",
      "dimagr",
      "fat loss",
      "bruciare grasso",
      "definiz",
    ])
  ) {
    return "fat_loss";
  }

  if (includesAny(text, ["forza", "strength"])) {
    return "strength";
  }

  if (
    includesAny(text, [
      "ricompos",
      "composizione",
      "mantenere peso e migliorare composizione",
    ])
  ) {
    return "recomposition";
  }

  if (
    includesAny(text, [
      "benessere",
      "energia",
      "salute",
      "stare meglio",
      "wellness",
    ])
  ) {
    return "wellness";
  }

  return "unknown";
}

function parseExperience(text: string): ExperienceLevel {
  if (includesAny(text, ["avanzato", "advanced"])) {
    return "advanced";
  }

  if (includesAny(text, ["intermedio", "intermediate"])) {
    return "intermediate";
  }

  return "beginner";
}

function parseEnvironment(text: string): TrainingEnvironment {
  if (includesAny(text, ["misto", "mixed"])) {
    return "mixed";
  }

  if (includesAny(text, ["palestra", "gym"])) {
    return "gym";
  }

  if (includesAny(text, ["casa", "home"])) {
    return "home";
  }

  if (includesAny(text, ["outdoor", "aria aperta", "parco", "aperto"])) {
    return "outdoor";
  }

  return "unknown";
}

function parseEquipment(text: string) {
  const entries = new Set<string>();

  if (includesAny(text, ["manubri", "dumbbell"])) {
    entries.add("dumbbells");
  }

  if (includesAny(text, ["elastici", "elastico", "band"])) {
    entries.add("bands");
  }

  if (includesAny(text, ["bilanciere", "barbell"])) {
    entries.add("barbell");
  }

  if (includesAny(text, ["macchine", "macchina", "machine"])) {
    entries.add("machines");
  }

  if (includesAny(text, ["cavi", "cable"])) {
    entries.add("cables");
  }

  if (includesAny(text, ["tappetino", "mat"])) {
    entries.add("mat");
  }

  if (includesAny(text, ["corpo libero", "bodyweight"])) {
    entries.add("bodyweight");
  }

  if (includesAny(text, ["cyclette", "bike"])) {
    entries.add("bike");
  }

  if (includesAny(text, ["tapis roulant"])) {
    entries.add("treadmill");
  }

  if (includesAny(text, ["ellittica"])) {
    entries.add("elliptical");
  }

  return [...entries];
}

function parseLimitations(text: string) {
  const entries = new Set<string>();

  if (includesAny(text, ["ginocchi", "knee"])) {
    entries.add("knee");
  }

  if (includesAny(text, ["spall", "shoulder", "sopra la testa", "overhead"])) {
    entries.add("shoulder");
  }

  if (includesAny(text, ["schiena", "lomb", "back"])) {
    entries.add("back");
  }

  if (includesAny(text, ["salti", "no salti", "jump", "impatto"])) {
    entries.add("no_jump");
  }

  return [...entries];
}

function parsePreferredTraining(text: string) {
  const entries = new Set<string>();

  if (includesAny(text, ["pesi", "macchine", "forza"])) {
    entries.add("weights");
  }

  if (includesAny(text, ["corpo libero", "bodyweight"])) {
    entries.add("bodyweight");
  }

  if (includesAny(text, ["cardio", "corsa", "camminata", "bike"])) {
    entries.add("cardio");
  }

  if (includesAny(text, ["breve e intenso", "hiit", "intenso"])) {
    entries.add("short_intense");
  }

  if (includesAny(text, ["tranquillo", "leggero"])) {
    entries.add("easy");
  }

  if (includesAny(text, ["mix", "misto", "variati"])) {
    entries.add("mixed");
  }

  return [...entries];
}

export function normalizeOnboardingAnswers(
  answersJson: unknown
): NormalizedTrainingProfile {
  const answers = isPlainObject(answersJson) ? answersJson : {};
  const goalText = getText([
    valueToString(answers.obiettivo),
    valueToString(answers.interesseNutrizione),
    valueToString(answers.risultatoDesiderato),
    valueToString(answers.perche),
  ]);
  const experienceText = getText([
    valueToString(answers.esperienza),
    valueToString(answers.tempoEsperienza),
    valueToString(answers.schedaStrutturata),
  ]);
  const environmentText = getText([
    valueToString(answers.luogo),
    valueToString(answers.attrezzatura),
    valueToString(answers.accessoAttrezzatura),
  ]);
  const equipmentText = getText([
    valueToString(answers.attrezzatura),
    valueToString(answers.accessoAttrezzatura),
    valueToString(answers.limitiLogistici),
  ]);
  const limitationsText = getText([
    valueToString(answers.doloriInfortuni),
    valueToString(answers.movimentiDaEvitare),
    valueToString(answers.infortuniLimitazioni),
    valueToString(answers.eserciziDaEvitare),
    valueToString(answers.limitiLogistici),
  ]);
  const preferenceText = getText([
    valueToString(answers.tipoAllenamentoPreferito),
    valueToString(answers.attivitaPiacciono),
    valueToString(answers.attivitaNonPiacciono),
    valueToString(answers.allenamentiRipetitiviVariati),
  ]);

  return {
    goal: parseGoal(goalText),
    experience: parseExperience(experienceText),
    daysPerWeek: parseDaysPerWeek(valueToString(answers.giorni)),
    environment: parseEnvironment(environmentText),
    equipmentPreference: parseEquipment(equipmentText),
    limitations: parseLimitations(limitationsText),
    preferredTraining: parsePreferredTraining(preferenceText),
    sessionMinutes: parseSessionMinutes(valueToString(answers.tempoAllenamento)),
  };
}
