import type { QuestionnaireProfile } from "@/lib/onboarding/questionnaire-profile";
import type {
  ExperienceLevel,
  NormalizedTrainingProfile,
  TrainingEnvironment,
  TrainingGoal,
} from "./types";

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

function parseSessionMinutes(value: string | null) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return 60;
  }

  if (normalized.includes("oltre 75")) {
    return 90;
  }

  const matches = normalized.match(/\d+/g);

  if (!matches || matches.length === 0) {
    return 60;
  }

  const parsed = matches
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry));

  if (parsed.length === 0) {
    return 60;
  }

  return Math.round(parsed.reduce((sum, entry) => sum + entry, 0) / parsed.length);
}

function includesAny(text: string, matches: string[]) {
  return matches.some((entry) => text.includes(entry));
}

export function mapQuestionnaireGoalToTrainingGoal(
  goal: QuestionnaireProfile["goal"]["primary"]
): TrainingGoal {
  switch (goal) {
    case "massa muscolare":
      return "hypertrophy";
    case "forza":
      return "strength";
    case "dimagrimento":
      return "fat_loss";
    case "ricomposizione":
      return "recomposition";
    case "salute/mantenimento":
    case "mobilita/postura":
      return "wellness";
    case "performance atletica":
    case "altro":
    default:
      return "unknown";
  }
}

function mapQuestionnaireLevelToExperience(
  level: QuestionnaireProfile["experience"]["level"]
): ExperienceLevel {
  switch (level) {
    case "intermedio":
      return "intermediate";
    case "avanzato":
    case "bodybuilder/utente esperto":
      return "advanced";
    case "principiante assoluto":
    case "principiante con esperienza":
    default:
      return "beginner";
  }
}

function mapQuestionnaireLocationToEnvironment(
  location: QuestionnaireProfile["equipment"]["location"]
): TrainingEnvironment {
  switch (normalizeText(location)) {
    case "casa":
      return "home";
    case "palestra":
      return "gym";
    case "outdoor":
      return "outdoor";
    case "misto":
      return "mixed";
    default:
      return "unknown";
  }
}

function mapEquipmentEntries(entries: string[]) {
  const mapped = new Set<string>();

  for (const entry of entries) {
    switch (normalizeText(entry)) {
      case "corpo libero":
        mapped.add("bodyweight");
        break;
      case "manubri":
        mapped.add("dumbbells");
        break;
      case "elastici":
        mapped.add("bands");
        break;
      case "bilanciere":
      case "rack":
        mapped.add("barbell");
        break;
      case "cavi":
      case "pulley":
        mapped.add("cables");
        break;
      case "macchine":
      case "leg press":
      case "lat machine":
        mapped.add("machines");
        break;
      case "cyclette/bike":
        mapped.add("bike");
        break;
      case "tapis roulant":
        mapped.add("treadmill");
        break;
      case "vogatore":
        mapped.add("rower");
        break;
      case "stair climber":
        mapped.add("stair_climber");
        break;
      default:
        break;
    }
  }

  return [...mapped];
}

function deriveLimitations(profile: QuestionnaireProfile) {
  const combined = normalizeText(
    [
      profile.limitations.medicalCondition,
      profile.limitations.recurringPain,
      profile.limitations.movementsToAvoid,
      profile.limitations.injuryNotes,
      profile.limitations.exercisesToAvoid,
      profile.equipment.notes,
      profile.cardio.impactTolerance,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const limitations = new Set<string>();

  if (includesAny(combined, ["ginocchi", "ginocchio", "knee"])) {
    limitations.add("knee");
  }

  if (includesAny(combined, ["spall", "shoulder", "overhead", "sopra la testa"])) {
    limitations.add("shoulder");
  }

  if (includesAny(combined, ["schiena", "lomb", "back"])) {
    limitations.add("back");
  }

  if (includesAny(combined, ["salti", "no salti", "jump", "impatto"])) {
    limitations.add("no_jump");
  }

  return [...limitations];
}

function derivePreferredTraining(profile: QuestionnaireProfile) {
  const preferred = new Set<string>();

  if (profile.equipment.available.length > 0) {
    preferred.add("weights");
  }

  if (
    profile.equipment.available.some(
      (entry) => normalizeText(entry) === "corpo libero"
    )
  ) {
    preferred.add("bodyweight");
  }

  if (
    profile.cardio.preferences.length > 0 ||
    profile.cardio.equipmentAvailable.length > 0
  ) {
    preferred.add("cardio");
  }

  return [...preferred];
}

export function buildProgramGenerationProfile(
  questionnaireProfile: QuestionnaireProfile,
  fallbackProfile?: NormalizedTrainingProfile
): NormalizedTrainingProfile {
  const environment = mapQuestionnaireLocationToEnvironment(
    questionnaireProfile.equipment.location
  );
  const equipmentPreference = mapEquipmentEntries([
    ...questionnaireProfile.equipment.available,
    ...questionnaireProfile.cardio.equipmentAvailable,
  ]);

  return {
    goal: mapQuestionnaireGoalToTrainingGoal(questionnaireProfile.goal.primary),
    experience: mapQuestionnaireLevelToExperience(
      questionnaireProfile.experience.level
    ),
    daysPerWeek:
      questionnaireProfile.trainingAvailability.daysPerWeek ??
      fallbackProfile?.daysPerWeek ??
      3,
    environment:
      environment === "unknown" ? fallbackProfile?.environment ?? "unknown" : environment,
    equipmentPreference:
      equipmentPreference.length > 0
        ? equipmentPreference
        : fallbackProfile?.equipmentPreference ?? [],
    limitations: (() => {
      const derived = deriveLimitations(questionnaireProfile);
      return derived.length > 0 ? derived : fallbackProfile?.limitations ?? [];
    })(),
    preferredTraining: (() => {
      const derived = derivePreferredTraining(questionnaireProfile);
      return derived.length > 0 ? derived : fallbackProfile?.preferredTraining ?? [];
    })(),
    sessionMinutes:
      questionnaireProfile.trainingAvailability.sessionDuration
        ? parseSessionMinutes(questionnaireProfile.trainingAvailability.sessionDuration)
        : fallbackProfile?.sessionMinutes ?? 60,
  };
}
