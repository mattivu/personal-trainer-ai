import { validateOnboardingSafety } from "@/lib/onboarding-safety";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparable(value: unknown) {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeString(entry))
      .filter((entry) => entry.length > 0);
  }

  const singleValue = normalizeString(value);
  return singleValue ? [singleValue] : [];
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

function coerceGoal(value: unknown) {
  const normalized = normalizeComparable(value);

  switch (normalized) {
    case "massa muscolare":
    case "aumentare massa muscolare":
      return "massa muscolare";
    case "forza":
    case "aumentare forza":
      return "forza";
    case "dimagrimento":
    case "perdere peso":
      return "dimagrimento";
    case "ricomposizione":
    case "mantenere peso e migliorare composizione":
      return "ricomposizione";
    case "performance atletica":
      return "performance atletica";
    case "salute/mantenimento":
    case "migliorare benessere/energia":
      return "salute/mantenimento";
    case "mobilita/postura":
    case "mobilita e postura":
      return "mobilita/postura";
    case "altro":
    case "non lo so":
      return "altro";
    default:
      return "salute/mantenimento";
  }
}

function coerceExperienceLevel(value: unknown) {
  const normalized = normalizeComparable(value);

  switch (normalized) {
    case "principiante assoluto":
      return "principiante assoluto";
    case "principiante con esperienza":
      return "principiante con esperienza";
    case "intermedio":
      return "intermedio";
    case "avanzato":
      return "avanzato";
    case "bodybuilder/utente esperto":
    case "bodybuilder o utente esperto":
    case "utente esperto":
      return "bodybuilder/utente esperto";
    case "principiante":
      return "principiante con esperienza";
    default:
      return "principiante con esperienza";
  }
}

function coerceSplitPreference(value: unknown) {
  const normalized = normalizeComparable(value);

  switch (normalized) {
    case "full body":
    case "upper/lower":
    case "push/pull/legs":
    case "monofrequenza":
    case "multifrequenza":
    case "focus su gruppo carente":
    case "non so":
    case "nessuna preferenza, decidi tu":
      return normalizeString(value);
    default:
      return "Nessuna preferenza, decidi tu";
  }
}

function coerceSingle(
  value: unknown,
  allowedValues: string[],
  fallback: string
) {
  const raw = normalizeString(value);
  return allowedValues.includes(raw) ? raw : fallback;
}

function coerceMulti(
  value: unknown,
  allowedValues: string[],
  options?: {
    fallback?: string[];
    max?: number;
    exclusive?: string;
  }
) {
  const values = normalizeStringArray(value).filter((entry) =>
    allowedValues.includes(entry)
  );

  if (options?.exclusive && values.includes(options.exclusive)) {
    return [options.exclusive];
  }

  const limited =
    typeof options?.max === "number" ? values.slice(0, options.max) : values;

  if (limited.length > 0) {
    return limited;
  }

  return options?.fallback ?? [];
}

export type QuestionnaireProfile = {
  version: 2;
  goal: {
    primary: string;
    pace: string;
    legacyGoal: string;
    targetWeightKg: number | null;
    desiredTimeline: string | null;
  };
  experience: {
    level: string;
    trainingAge: string | null;
    followsStructuredProgramming: string | null;
    knowsRirRpe: string | null;
    knowsAdvancedTechniques: string | null;
  };
  trainingAvailability: {
    daysPerWeek: number | null;
    sessionDuration: string | null;
    consecutiveDaysPossible: string | null;
    restDayPreference: string | null;
    perceivedRecovery: string | null;
    sleepQuality: string | null;
    stressLevel: string | null;
  };
  splitPreference: {
    preference: string;
    isFlexible: boolean;
  };
  muscleFocus: {
    priorities: string[];
    notes: string | null;
  };
  equipment: {
    location: string | null;
    available: string[];
    notes: string | null;
  };
  cardio: {
    currentLevel: string;
    preferences: string[];
    equipmentAvailable: string[];
    dailySteps: string | null;
    timingPreference: string | null;
    impactTolerance: string | null;
    goal: string | null;
  };
  advancedTechniques: {
    preference: string[];
    notes: string | null;
  };
  exercisePreferences: {
    favoriteExercises: string | null;
    avoidExercises: string | null;
    painfulExercises: string | null;
    preferredMachines: string | null;
    safetyVsIntensity: string | null;
  };
  nutritionAdaptation: {
    goal: string | null;
    mealTrackingWillingness: string | null;
    trackingStyle: string | null;
    mealsPerDay: string | null;
    appetite: string | null;
    challenges: string[];
    adjustmentWillingness: string | null;
  };
  limitations: {
    medicalCondition: string | null;
    recurringPain: string | null;
    painIntensity: string | null;
    movementsToAvoid: string | null;
    injuryNotes: string | null;
    exercisesToAvoid: string | null;
  };
  safetyFlags: ReturnType<typeof validateOnboardingSafety>;
};

export function buildQuestionnaireProfile(
  answersJson: unknown
): QuestionnaireProfile {
  const answers = isPlainObject(answersJson) ? answersJson : {};
  const focusAllowed = [
    "Petto",
    "Petto alto",
    "Dorso ampiezza",
    "Dorso spessore",
    "Spalle laterali",
    "Deltoidi posteriori",
    "Braccia",
    "Quadricipiti",
    "Femorali",
    "Glutei",
    "Polpacci",
    "Core",
    "Mobilita",
    "Postura",
    "Nessuno",
  ];
  const equipmentAllowed = [
    "Corpo libero",
    "Manubri",
    "Bilanciere",
    "Panca",
    "Rack",
    "Cavi",
    "Macchine",
    "Leg press",
    "Lat machine",
    "Pulley",
    "Sbarra trazioni",
    "Elastici",
    "Kettlebell",
    "TRX/anelli",
    "Tapis roulant",
    "Cyclette/bike",
    "Vogatore",
    "Stair climber",
    "Box/CrossFit",
    "Sled/slitta",
    "Corda climbing",
    "Attrezzatura strongman",
    "Parete arrampicata/Boulder",
    "Altro",
  ];
  const cardioAllowed = [
    "Camminata",
    "Corsa",
    "Bike/Cyclette",
    "Vogatore",
    "Tapis roulant inclinato",
    "Stair climber",
    "HIIT",
    "Circuiti",
    "Sport",
  ];
  const techniquesAllowed = [
    "Non voglio tecniche avanzate",
    "Ok tecniche semplici",
    "Rest-pause",
    "Drop set",
    "Superserie",
    "Myo-reps",
    "Top set + back-off",
    "Cluster",
    "Tempo controllato",
    "Stripping/metaboliche",
    "Decidi tu",
  ];
  const nutritionChallengesAllowed = [
    "Weekend",
    "Fame serale",
    "Fuori casa",
    "Dolci/snack",
    "Poca proteina",
  ];

  const legacyGoal = normalizeString(answers.obiettivo);
  const primaryGoal = coerceGoal(
    answers.obiettivoTraining || answers.obiettivo || answers.risultatoDesiderato
  );
  const level = coerceExperienceLevel(
    answers.livelloEsperienza || answers.esperienza
  );
  const focusPriorities = coerceMulti(
    answers.focusMuscolari,
    focusAllowed,
    {
      max: 3,
      exclusive: "Nessuno",
      fallback: [],
    }
  );

  return {
    version: 2,
    goal: {
      primary: primaryGoal,
      pace: coerceSingle(
        answers.intensitaObiettivo,
        ["Conservativo", "Moderato", "Aggressivo solo se sicuro"],
        "Moderato"
      ),
      legacyGoal:
        legacyGoal ||
        (primaryGoal === "massa muscolare"
          ? "Aumentare massa muscolare"
          : primaryGoal === "forza"
            ? "Aumentare forza"
            : primaryGoal === "dimagrimento"
              ? "Perdere peso"
              : primaryGoal === "ricomposizione"
                ? "Mantenere peso e migliorare composizione"
                : "Migliorare benessere/energia"),
      targetWeightKg: parseNumber(answers.pesoObiettivoKg),
      desiredTimeline: normalizeString(answers.tempisticaDesiderata) || null,
    },
    experience: {
      level,
      trainingAge: normalizeString(answers.tempoEsperienza) || null,
      followsStructuredProgramming:
        normalizeString(answers.schedaStrutturata) || null,
      knowsRirRpe: normalizeString(answers.conosceRirRpe) || null,
      knowsAdvancedTechniques:
        normalizeString(answers.conosceTecnicheAvanzate) || null,
    },
    trainingAvailability: {
      daysPerWeek: parseNumber(answers.giorni),
      sessionDuration: normalizeString(answers.tempoAllenamento) || null,
      consecutiveDaysPossible:
        normalizeString(answers.giorniConsecutiviPossibili) || null,
      restDayPreference: normalizeString(answers.preferenzaRiposo) || null,
      perceivedRecovery: normalizeString(answers.recuperoAllenamenti) || null,
      sleepQuality: normalizeString(answers.qualitaSonno) || null,
      stressLevel: normalizeString(answers.stress) || null,
    },
    splitPreference: {
      preference: coerceSplitPreference(answers.preferenzaSplit),
      isFlexible:
        normalizeComparable(answers.preferenzaSplit) ===
          "nessuna preferenza, decidi tu" ||
        normalizeComparable(answers.preferenzaSplit) === "non so",
    },
    muscleFocus: {
      priorities: focusPriorities,
      notes: normalizeString(answers.focusMuscolariNote) || null,
    },
    equipment: {
      location: normalizeString(answers.luogo) || null,
      available: coerceMulti(answers.attrezzaturaDettagliata, equipmentAllowed, {
        fallback: normalizeStringArray(answers.attrezzatura),
      }),
      notes: normalizeString(answers.limitiLogistici) || null,
    },
    cardio: {
      currentLevel: coerceSingle(
        answers.cardioAttuale,
        ["Mai", "Poco", "1-2 volte", "3+ volte"],
        "Poco"
      ),
      preferences: coerceMulti(answers.preferenzeCardio, cardioAllowed, {
        fallback: [],
      }),
      equipmentAvailable: coerceMulti(
        answers.attrezzaturaCardioDisponibile,
        equipmentAllowed,
        {
          fallback: [],
        }
      ),
      dailySteps:
        normalizeString(answers.passiGiornalieriIndicativi) ||
        normalizeString(answers.passiMedi) ||
        null,
      timingPreference: normalizeString(answers.preferenzaTimingCardio) || null,
      impactTolerance: normalizeString(answers.tolleranzaCardio) || null,
      goal: normalizeString(answers.obiettivoCardio) || null,
    },
    advancedTechniques: {
      preference: coerceMulti(
        answers.tecnicheAvanzatePreferite,
        techniquesAllowed,
        {
          fallback: ["Decidi tu"],
          exclusive: "Non voglio tecniche avanzate",
        }
      ),
      notes: normalizeString(answers.noteTecnicheAvanzate) || null,
    },
    exercisePreferences: {
      favoriteExercises: normalizeString(answers.eserciziPreferiti) || null,
      avoidExercises: normalizeString(answers.eserciziDaEvitare) || null,
      painfulExercises: normalizeString(answers.eserciziCheDannoFastidio) || null,
      preferredMachines: normalizeString(answers.macchinePreferite) || null,
      safetyVsIntensity:
        normalizeString(answers.prioritaSicurezzaVsIntensita) || null,
    },
    nutritionAdaptation: {
      goal:
        normalizeString(answers.obiettivoNutrizionale) ||
        normalizeString(answers.interesseNutrizione) ||
        null,
      mealTrackingWillingness:
        normalizeString(answers.registrarePasti) || null,
      trackingStyle:
        normalizeString(answers.preferenzaTracking) || null,
      mealsPerDay:
        normalizeString(answers.pastiGiorno) || null,
      appetite: normalizeString(answers.fameAppetito) || null,
      challenges: coerceMulti(
        answers.difficoltaNutrizione,
        nutritionChallengesAllowed,
        {
          fallback: [],
        }
      ),
      adjustmentWillingness:
        normalizeString(answers.disponibilitaAggiustamenti) || null,
    },
    limitations: {
      medicalCondition:
        normalizeString(answers.condizioniMedicheRilevanti) || null,
      recurringPain: normalizeString(answers.doloriInfortuni) || null,
      painIntensity: normalizeString(answers.intensitaFastidio) || null,
      movementsToAvoid: normalizeString(answers.movimentiDaEvitare) || null,
      injuryNotes: normalizeString(answers.infortuniLimitazioni) || null,
      exercisesToAvoid: normalizeString(answers.eserciziDaEvitare) || null,
    },
    safetyFlags: validateOnboardingSafety(answers),
  };
}
