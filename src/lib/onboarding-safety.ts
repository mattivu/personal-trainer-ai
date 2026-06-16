export type SafetyStatus = "ok" | "warning" | "restricted" | "blocked";

export type SafetyResult = {
  status: SafetyStatus;
  codes: string[];
  messages: string[];
};

const SAFETY_MESSAGES = {
  AGE_UNDER_14_BLOCKED:
    "Questa app non è adatta alla tua fascia d’età. Per allenamento e alimentazione è necessario il supporto di un genitore e di un professionista qualificato.",
  TARGET_BMI_TOO_LOW:
    "Il peso obiettivo inserito risulta troppo basso rispetto alla tua altezza. Per sicurezza non possiamo creare un percorso orientato a raggiungere questo peso. Se hai dubbi sul tuo peso ideale, confrontati con un professionista sanitario.",
  CURRENT_UNDERWEIGHT_WEIGHT_LOSS_BLOCKED:
    "Dai dati inseriti risulti già sotto una soglia di peso potenzialmente bassa. L’app non può creare un percorso dimagrante in questa condizione.",
  AGGRESSIVE_WEIGHT_LOSS_TIMELINE:
    "La tempistica scelta sembra troppo aggressiva rispetto al peso obiettivo. Per sicurezza scegli un obiettivo più graduale.",
  MINOR_RESTRICTED_MODE:
    "Per la tua fascia d’età l’app potrà fornire solo indicazioni generali e conservative. Non verranno usati deficit calorici aggressivi, target nutrizionali rigidi o allenamenti ad alta intensità non supervisionati.",
  EATING_DISORDER_RISK:
    "Per sicurezza l’app non userà obiettivi di deficit calorico, conteggio calorie o macro come guida principale. In presenza di dubbi sul rapporto con il cibo è importante confrontarsi con un professionista qualificato.",
  MEDICAL_CONDITION_REQUIRES_PROFESSIONAL:
    "Le informazioni inserite richiedono prudenza. L’app potrà fornire solo indicazioni generali e conservative, ma non sostituisce il parere di un professionista sanitario.",
} as const;

type SafetyCode = keyof typeof SAFETY_MESSAGES;

const STATUS_RANK: Record<SafetyStatus, number> = {
  ok: 0,
  warning: 1,
  restricted: 2,
  blocked: 3,
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

function hasCautiousAnswer(value: unknown) {
  const normalized = normalizeComparable(value);
  return normalized === "si" || normalized === "preferisco non rispondere";
}

function addFinding(
  result: SafetyResult,
  status: Exclude<SafetyStatus, "ok">,
  code: SafetyCode
) {
  if (!result.codes.includes(code)) {
    result.codes.push(code);
    result.messages.push(SAFETY_MESSAGES[code]);
  }

  if (STATUS_RANK[status] > STATUS_RANK[result.status]) {
    result.status = status;
  }
}

export function calculateAge(birthDate: string | Date): number | null {
  const date = birthDate instanceof Date ? birthDate : new Date(birthDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const birthdayThisYear = new Date(
    today.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  return Number.isFinite(bmi) ? bmi : null;
}

export function validateOnboardingSafety(
  answers: Record<string, unknown>
): SafetyResult {
  const result: SafetyResult = {
    status: "ok",
    codes: [],
    messages: [],
  };

  const age = normalizeString(answers.dataNascita)
    ? calculateAge(normalizeString(answers.dataNascita))
    : null;
  const heightCm = parseNumber(answers.altezzaCm);
  const currentWeightKg = parseNumber(answers.pesoKg);
  const rawTargetWeightKg = parseNumber(answers.pesoObiettivoKg);
  const targetWeightKg =
    normalizeComparable(answers.pesoObiettivoPresente) === "no"
      ? null
      : rawTargetWeightKg;
  const currentBMI =
    currentWeightKg !== null && heightCm !== null
      ? calculateBMI(currentWeightKg, heightCm)
      : null;
  const targetBMI =
    targetWeightKg !== null && heightCm !== null
      ? calculateBMI(targetWeightKg, heightCm)
      : null;

  if (age !== null && age < 14) {
    addFinding(result, "blocked", "AGE_UNDER_14_BLOCKED");
  } else if (age !== null && age >= 14 && age <= 17) {
    addFinding(result, "restricted", "MINOR_RESTRICTED_MODE");
  }

  if (age !== null && age >= 18 && targetBMI !== null && targetBMI < 18.5) {
    addFinding(result, "blocked", "TARGET_BMI_TOO_LOW");
  }

  const wantsWeightLoss =
    normalizeComparable(answers.obiettivo) === "perdere peso" ||
    (currentWeightKg !== null &&
      targetWeightKg !== null &&
      targetWeightKg < currentWeightKg);

  if (
    age !== null &&
    age >= 18 &&
    currentBMI !== null &&
    currentBMI < 18.5 &&
    wantsWeightLoss
  ) {
    addFinding(
      result,
      "blocked",
      "CURRENT_UNDERWEIGHT_WEIGHT_LOSS_BLOCKED"
    );
  }

  if (
    currentWeightKg !== null &&
    targetWeightKg !== null &&
    targetWeightKg < currentWeightKg &&
    normalizeComparable(answers.tempisticaDesiderata) === "1-2 mesi"
  ) {
    const weightLossRatio = (currentWeightKg - targetWeightKg) / currentWeightKg;

    if (weightLossRatio > 0.1) {
      addFinding(result, "blocked", "AGGRESSIVE_WEIGHT_LOSS_TIMELINE");
    }
  }

  if (
    hasCautiousAnswer(answers.disturboAlimentare) ||
    hasCautiousAnswer(answers.pauraAumentoPeso) ||
    hasCautiousAnswer(answers.saltoPastiCompensazione)
  ) {
    addFinding(result, "restricted", "EATING_DISORDER_RISK");
  }

  if (hasCautiousAnswer(answers.condizioniMedicheRilevanti)) {
    addFinding(
      result,
      "restricted",
      "MEDICAL_CONDITION_REQUIRES_PROFESSIONAL"
    );
  }

  return result;
}
