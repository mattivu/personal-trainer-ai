import type { NutritionGoal } from "@prisma/client";
import {
  calculateAge,
  calculateBMI,
  validateOnboardingSafety,
} from "@/lib/onboarding-safety";

type CalculationInput = {
  answers: Record<string, unknown>;
  profile?: {
    heightCm?: number | null;
    startingWeight?: number | null;
    sex?: string | null;
    birthDate?: Date | null;
  } | null;
};

export type NutritionCalculationResult = {
  goal: NutritionGoal;
  estimatedBmr: number | null;
  estimatedTdee: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  calculationMethod: string;
  inputSummary: {
    age: number | null;
    sex: string | null;
    heightCm: number | null;
    weightKg: number | null;
    bmi: number | null;
  };
  isDataLimited: boolean;
  warnings: string[];
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparable(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function roundToNearestFive(value: number) {
  return Math.round(value / 5) * 5;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function mapGoal(answers: Record<string, unknown>): NutritionGoal {
  const normalizedGoal = normalizeComparable(answers.obiettivo);

  if (normalizedGoal === "perdere peso") {
    return "deficit";
  }

  if (normalizedGoal === "aumentare massa muscolare") {
    return "surplus";
  }

  if (normalizedGoal === "mantenere peso e migliorare composizione") {
    return "recomposition";
  }

  return "maintenance";
}

function getActivityMultiplier(answers: Record<string, unknown>) {
  const situation = normalizeComparable(answers.situazionePrincipale);
  const sittingHours = normalizeComparable(answers.oreSeduto);
  const steps = normalizeComparable(answers.passiMedi);
  const travel = normalizeComparable(answers.spostamenti);
  const trainingDays = clamp(parseNumber(answers.giorni) ?? 3, 0, 7);

  let multiplier = 1.35;

  if (
    situation === "lavoro in piedi/attivo" ||
    travel === "cammino spesso" ||
    steps === "6000-10000"
  ) {
    multiplier += 0.1;
  }

  if (
    situation === "lavoro fisicamente pesante" ||
    travel === "bici/spostamenti attivi" ||
    steps === "piu di 10000"
  ) {
    multiplier += 0.2;
  }

  if (
    situation === "lavoro sedentario" ||
    steps === "meno di 3000" ||
    sittingHours === "piu di 8"
  ) {
    multiplier -= 0.05;
  }

  multiplier += Math.min(trainingDays, 6) * 0.02;

  return clamp(multiplier, 1.2, 1.75);
}

function estimateBmr(input: {
  sex: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
}) {
  const { sex, age, heightCm, weightKg } = input;

  if (age === null || heightCm === null || weightKg === null || !sex) {
    return null;
  }

  const normalizedSex = sex.toLowerCase();

  if (normalizedSex === "uomo") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  if (normalizedSex === "donna") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  return null;
}

function estimateFallbackTdee(input: {
  weightKg: number | null;
  answers: Record<string, unknown>;
}) {
  const { weightKg, answers } = input;
  const multiplier = getActivityMultiplier(answers);

  if (weightKg !== null) {
    const weightBased = weightKg * (multiplier >= 1.55 ? 31 : 29);
    return roundToNearestFive(weightBased);
  }

  return 2000;
}

function buildWarnings(input: {
  goal: NutritionGoal;
  bmi: number | null;
  age: number | null;
  safety: ReturnType<typeof validateOnboardingSafety>;
  dataLimited: boolean;
}) {
  const warnings: string[] = [];

  if (input.dataLimited) {
    warnings.push(
      "Dati incompleti: il target usa un fallback prudente e resta solo orientativo."
    );
  }

  if (input.age !== null && input.age < 18) {
    warnings.push(
      "Per la tua fascia d'età mostriamo solo stime prudenti e senza deficit marcati."
    );
  }

  if (input.bmi !== null && input.bmi < 18.5) {
    warnings.push(
      "Il peso attuale risulta su una fascia bassa: evitiamo target in deficit e manteniamo stime conservative."
    );
  }

  if (input.safety.status === "restricted" || input.safety.status === "blocked") {
    warnings.push(
      "Sono presenti segnali di prudenza nel questionario: queste indicazioni restano generali e non sostituiscono un professionista."
    );
  }

  if (
    input.goal === "deficit" &&
    (input.safety.status === "restricted" ||
      input.safety.status === "blocked" ||
      (input.age !== null && input.age < 18) ||
      (input.bmi !== null && input.bmi < 18.5))
  ) {
    warnings.push(
      "Per prudenza non proponiamo un deficit aggressivo con i dati attuali."
    );
  }

  return warnings;
}

export function calculateNutritionTargets({
  answers,
  profile,
}: CalculationInput): NutritionCalculationResult {
  const fallbackBirthDate = profile?.birthDate ?? null;
  const age =
    normalizeString(answers.dataNascita) !== ""
      ? calculateAge(normalizeString(answers.dataNascita))
      : fallbackBirthDate
        ? calculateAge(fallbackBirthDate)
        : null;
  const heightCm = parseNumber(answers.altezzaCm) ?? profile?.heightCm ?? null;
  const weightKg =
    parseNumber(answers.pesoKg) ?? profile?.startingWeight ?? null;
  const sex = normalizeString(answers.sesso) || profile?.sex || null;
  const bmi =
    heightCm !== null && weightKg !== null
      ? calculateBMI(weightKg, heightCm)
      : null;
  const goal = mapGoal(answers);
  const safety = validateOnboardingSafety(answers);
  const estimatedBmr = estimateBmr({
    sex,
    age,
    heightCm,
    weightKg,
  });
  const activityMultiplier = getActivityMultiplier(answers);
  const estimatedTdee =
    estimatedBmr !== null
      ? roundToNearestFive(estimatedBmr * activityMultiplier)
      : estimateFallbackTdee({ weightKg, answers });
  const dataLimited = estimatedBmr === null;

  let calorieMultiplier = 1;

  if (goal === "deficit") {
    calorieMultiplier = 0.88;
  } else if (goal === "surplus") {
    calorieMultiplier = 1.07;
  } else if (goal === "recomposition") {
    calorieMultiplier = 0.97;
  }

  const conservativeMode =
    safety.status === "restricted" ||
    safety.status === "blocked" ||
    (age !== null && age < 18) ||
    (bmi !== null && bmi < 18.5);

  if (conservativeMode) {
    if (goal === "deficit") {
      calorieMultiplier = 1;
    }

    if (goal === "recomposition") {
      calorieMultiplier = 1;
    }
  }

  const calorieTarget = roundToNearestFive(
    clamp(estimatedTdee * calorieMultiplier, 1400, 4500)
  );
  const referenceWeightKg = weightKg ?? 70;

  const proteinPerKg =
    goal === "deficit" || goal === "recomposition" ? 1.8 : 1.6;
  const fatPerKg = conservativeMode ? 0.9 : 0.8;

  const proteinTarget = Math.max(
    90,
    Math.round(referenceWeightKg * proteinPerKg)
  );
  const fatTarget = Math.max(45, Math.round(referenceWeightKg * fatPerKg));
  const remainingCalories =
    calorieTarget - proteinTarget * 4 - fatTarget * 9;
  const carbsTarget = Math.max(80, Math.round(remainingCalories / 4));

  const warnings = buildWarnings({
    goal,
    bmi,
    age,
    safety,
    dataLimited,
  });

  return {
    goal,
    estimatedBmr: estimatedBmr ? roundToNearestFive(estimatedBmr) : null,
    estimatedTdee,
    calorieTarget,
    proteinTarget,
    carbsTarget,
    fatTarget,
    calculationMethod:
      estimatedBmr !== null ? "mifflin_st_jeor" : weightKg !== null
        ? "fallback_weight_based"
        : "fallback_default",
    inputSummary: {
      age,
      sex,
      heightCm,
      weightKg,
      bmi,
    },
    isDataLimited: dataLimited,
    warnings,
  };
}
