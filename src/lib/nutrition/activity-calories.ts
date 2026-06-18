type ActivityConfidence = "low" | "medium" | "high";

type ActivityCaloriesWorkoutInput = {
  workoutName: string;
  workoutFocus?: string | null;
  estimatedMinutes: number | null;
  durationMinutes: number | null;
  perceivedEffort: number | null;
  exerciseNames: string[];
  exerciseIntensityHints: string[];
};

export type EstimatedActivity = {
  workoutName: string;
  estimatedCalories: number;
  estimatedDurationMinutes: number;
  met: number;
  confidence: ActivityConfidence;
  explanation: string;
};

export type DailyActivityCaloriesEstimate = {
  totalEstimatedActivityCalories: number;
  activities: EstimatedActivity[];
  disclaimer: string;
};

const DEFAULT_WEIGHT_KG = 70;

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToNearestFive(value: number) {
  return Math.round(value / 5) * 5;
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getWorkoutType(input: ActivityCaloriesWorkoutInput) {
  const combinedText = [
    input.workoutName,
    input.workoutFocus ?? "",
    ...input.exerciseNames,
    ...input.exerciseIntensityHints,
  ]
    .map(normalizeText)
    .join(" ");

  const mobilityTerms = [
    "mobil",
    "stretch",
    "yoga",
    "pilates",
    "recupero attivo",
    "recupero",
    "flow",
    "warm up",
    "cool down",
    "core e controllo",
  ];
  const cardioTerms = [
    "conditioning",
    "cardio",
    "metcon",
    "hiit",
    "interval",
    "circuit",
    "bike",
    "cyclette",
    "row",
    "rowing",
    "vogatore",
    "run",
    "corsa",
    "cammin",
    "ellittica",
    "jump",
    "burpee",
    "sprint",
  ];
  const strengthTerms = [
    "forza",
    "strength",
    "push",
    "pull",
    "legs",
    "upper",
    "lower",
    "full body",
    "petto",
    "dorso",
    "spalle",
    "tricipiti",
    "bicipiti",
    "gambe",
    "quad",
    "posterior chain",
    "squat",
    "deadlift",
    "hinge",
    "bench",
    "press",
    "row",
    "lat machine",
    "trazioni",
    "affondi",
    "stacchi",
  ];

  const mobility = includesAny(combinedText, mobilityTerms);
  const cardio = includesAny(combinedText, cardioTerms);
  const strength = includesAny(combinedText, strengthTerms);

  if (mobility && !cardio && !strength) {
    return "mobility" as const;
  }

  if (cardio && strength) {
    return "mixed" as const;
  }

  if (cardio) {
    return "conditioning" as const;
  }

  if (strength) {
    return "strength" as const;
  }

  return "mixed" as const;
}

function getBaseMet(
  type: ReturnType<typeof getWorkoutType>,
  input: ActivityCaloriesWorkoutInput
) {
  const combinedHints = [...input.exerciseIntensityHints, input.workoutFocus ?? ""]
    .map(normalizeText)
    .join(" ");
  const effort = input.perceivedEffort;

  if (type === "mobility") {
    return 2.6;
  }

  if (type === "conditioning") {
    if (effort !== null && effort >= 8) {
      return 7.4;
    }

    return 6.8;
  }

  if (type === "mixed") {
    return 5.2;
  }

  const intenseStrengthTerms = [
    "pesante",
    "intenso",
    "forza massima",
    "rpe 8",
    "rpe 9",
    "rpe 10",
    "multiarticolare",
  ];
  const moderateStrengthTerms = [
    "tecnica",
    "controllo",
    "base",
    "sostenibile",
    "moderato",
    "hypertrophy",
    "ipertrofia",
  ];

  if (
    includesAny(combinedHints, intenseStrengthTerms) ||
    (effort !== null && effort >= 8)
  ) {
    return 5.4;
  }

  if (includesAny(combinedHints, moderateStrengthTerms)) {
    return 4;
  }

  return 4.4;
}

function applyEffortAdjustment(baseMet: number, perceivedEffort: number | null) {
  if (perceivedEffort === null) {
    return baseMet;
  }

  if (perceivedEffort <= 4) {
    return baseMet - 0.3;
  }

  if (perceivedEffort >= 8) {
    return baseMet + 0.4;
  }

  return baseMet;
}

function getEstimatedDurationMinutes(
  input: ActivityCaloriesWorkoutInput,
  type: ReturnType<typeof getWorkoutType>
) {
  if (input.durationMinutes && input.durationMinutes > 0) {
    return input.durationMinutes;
  }

  if (input.estimatedMinutes && input.estimatedMinutes > 0) {
    return input.estimatedMinutes;
  }

  if (type === "mobility" || type === "conditioning") {
    return 45;
  }

  return 60;
}

function getConfidence(input: {
  hasWeight: boolean;
  usedRealDuration: boolean;
  usedPlannedDuration: boolean;
  workoutType: ReturnType<typeof getWorkoutType>;
  exerciseCount: number;
}) {
  let score = 0;

  if (input.hasWeight) {
    score += 1;
  }

  if (input.usedRealDuration) {
    score += 1;
  } else if (input.usedPlannedDuration) {
    score += 0.5;
  }

  if (input.exerciseCount >= 3 || input.workoutType !== "mixed") {
    score += 1;
  }

  if (score >= 2.5) {
    return "high" as const;
  }

  if (score >= 1.5) {
    return "medium" as const;
  }

  return "low" as const;
}

function getExplanation(input: {
  type: ReturnType<typeof getWorkoutType>;
  met: number;
  confidence: ActivityConfidence;
  usedRealDuration: boolean;
  usedPlannedDuration: boolean;
  usedWeightFallback: boolean;
  perceivedEffort: number | null;
}) {
  const typeLabelMap = {
    mobility: "mobilita/stretching",
    strength: "forza",
    conditioning: "conditioning/cardio",
    mixed: "seduta mista",
  } as const;

  const durationSource = input.usedRealDuration
    ? "durata reale"
    : input.usedPlannedDuration
      ? "durata prevista"
      : "durata prudente";
  const effortNote =
    input.perceivedEffort === null
      ? ""
      : input.perceivedEffort >= 8
        ? " Fatica finale alta: MET leggermente aumentato."
        : input.perceivedEffort <= 4
          ? " Fatica finale bassa: MET leggermente ridotto."
          : "";
  const weightNote = input.usedWeightFallback
    ? " Peso non disponibile: usato fallback prudente."
    : "";

  return `Stima ${typeLabelMap[input.type]} con MET ${input.met.toFixed(1)} e ${durationSource}.${effortNote}${weightNote} Affidabilita ${input.confidence}.`;
}

export function estimateDailyActivityCalories(input: {
  workouts: ActivityCaloriesWorkoutInput[];
  weightKg?: number | null;
}): DailyActivityCaloriesEstimate {
  const hasWeight = typeof input.weightKg === "number" && input.weightKg > 0;
  const resolvedWeightKg = hasWeight ? Number(input.weightKg) : DEFAULT_WEIGHT_KG;

  const activities = input.workouts.map<EstimatedActivity>((workout) => {
    const workoutType = getWorkoutType(workout);
    const baseMet = getBaseMet(workoutType, workout);
    const met = clamp(
      applyEffortAdjustment(baseMet, workout.perceivedEffort),
      workoutType === "mobility"
        ? 2
        : workoutType === "conditioning"
          ? 6
          : workoutType === "strength"
            ? 3.5
            : 4,
      workoutType === "mobility"
        ? 3
        : workoutType === "conditioning"
          ? 8
          : workoutType === "strength"
            ? 6
            : 6.5
    );
    const estimatedDurationMinutes = getEstimatedDurationMinutes(workout, workoutType);
    const usedRealDuration =
      typeof workout.durationMinutes === "number" && workout.durationMinutes > 0;
    const usedPlannedDuration =
      !usedRealDuration &&
      typeof workout.estimatedMinutes === "number" &&
      workout.estimatedMinutes > 0;
    const estimatedCalories = roundToNearestFive(
      (met * 3.5 * resolvedWeightKg) / 200 * estimatedDurationMinutes
    );
    const confidence = getConfidence({
      hasWeight,
      usedRealDuration,
      usedPlannedDuration,
      workoutType,
      exerciseCount: workout.exerciseNames.length,
    });

    return {
      workoutName: workout.workoutName,
      estimatedCalories,
      estimatedDurationMinutes,
      met: Math.round(met * 10) / 10,
      confidence,
      explanation: getExplanation({
        type: workoutType,
        met: Math.round(met * 10) / 10,
        confidence,
        usedRealDuration,
        usedPlannedDuration,
        usedWeightFallback: !hasWeight,
        perceivedEffort: workout.perceivedEffort,
      }),
    };
  });

  return {
    totalEstimatedActivityCalories: activities.reduce(
      (total, activity) => total + activity.estimatedCalories,
      0
    ),
    activities,
    disclaimer:
      "Le calorie attivita sono una stima indicativa. Non usarle come valore preciso da recuperare automaticamente con il cibo.",
  };
}
