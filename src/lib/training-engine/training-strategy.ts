import type { QuestionnaireProfile } from "@/lib/onboarding/questionnaire-profile";
import { formatUserFacingSplitLabel } from "@/lib/user-facing-copy";

export type StrategySplitType =
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "ppl_upper_lower"
  | "body_part_split"
  | "hybrid_specialization";

export type StrategyMuscleKey =
  | "petto"
  | "dorso"
  | "spalle"
  | "deltoidi laterali"
  | "deltoidi posteriori"
  | "bicipiti"
  | "tricipiti"
  | "quadricipiti"
  | "femorali"
  | "glutei"
  | "polpacci"
  | "core";

export type WeeklySetTarget = {
  min: number;
  target: number;
  max: number;
  reason: string;
};

export type TrainingStrategy = {
  version: 2;
  goal: QuestionnaireProfile["goal"]["primary"];
  experienceLevel: QuestionnaireProfile["experience"]["level"];
  weeklyTrainingDays: number;
  sessionDurationMinutes: number;
  split: {
    type: StrategySplitType;
    reason: string;
    weeklyResistanceSessions: number;
    sessionThemes: Array<{
      dayIndex: number;
      title: string;
      focus: string[];
      secondaryFocus: string[];
      notes: string[];
    }>;
  };
  volume: {
    weeklySetsByMuscle: Record<StrategyMuscleKey, WeeklySetTarget>;
    focusBoosts: string[];
    deloadRecommended: boolean;
  };
  frequency: {
    muscleFrequencyByMuscle: Record<StrategyMuscleKey, number>;
    reason: string;
  };
  cardio: {
    weeklySessions: number;
    preferredModalities: string[];
    intensity: "low" | "moderate" | "mixed" | "high";
    minutesPerSession: number;
    placement: "after_weights" | "separate_days" | "mixed";
    reason: string;
  };
  intensity: {
    defaultRir: number;
    rirRange: [number, number];
    failureAllowed: boolean;
    failureNotes: string;
  };
  techniques: {
    allowed: string[];
    excluded: string[];
    reason: string;
  };
  warnings: string[];
};

type RecoveryStatus = "low" | "moderate" | "high";
type VolumeTier = "compound" | "shoulders" | "small" | "core";

const MUSCLE_KEYS: StrategyMuscleKey[] = [
  "petto",
  "dorso",
  "spalle",
  "deltoidi laterali",
  "deltoidi posteriori",
  "bicipiti",
  "tricipiti",
  "quadricipiti",
  "femorali",
  "glutei",
  "polpacci",
  "core",
];

const MUSCLE_VOLUME_TIERS: Record<StrategyMuscleKey, VolumeTier> = {
  petto: "compound",
  dorso: "compound",
  spalle: "shoulders",
  "deltoidi laterali": "small",
  "deltoidi posteriori": "small",
  bicipiti: "small",
  tricipiti: "small",
  quadricipiti: "compound",
  femorali: "compound",
  glutei: "compound",
  polpacci: "small",
  core: "core",
};

const FOCUS_TO_MUSCLES: Record<string, StrategyMuscleKey[]> = {
  Petto: ["petto"],
  "Petto alto": ["petto"],
  "Dorso ampiezza": ["dorso"],
  "Dorso spessore": ["dorso"],
  "Spalle laterali": ["deltoidi laterali", "spalle"],
  "Deltoidi posteriori": ["deltoidi posteriori", "spalle"],
  Braccia: ["bicipiti", "tricipiti"],
  Quadricipiti: ["quadricipiti"],
  Femorali: ["femorali"],
  Glutei: ["glutei"],
  Polpacci: ["polpacci"],
  Core: ["core"],
};

const LEVEL_BASE_TARGETS: Record<
  QuestionnaireProfile["experience"]["level"],
  Record<VolumeTier, { min: number; target: number; max: number }>
> = {
  "principiante assoluto": {
    compound: { min: 6, target: 8, max: 10 },
    shoulders: { min: 4, target: 6, max: 8 },
    small: { min: 3, target: 5, max: 7 },
    core: { min: 4, target: 6, max: 8 },
  },
  "principiante con esperienza": {
    compound: { min: 8, target: 10, max: 12 },
    shoulders: { min: 5, target: 7, max: 9 },
    small: { min: 4, target: 6, max: 8 },
    core: { min: 4, target: 6, max: 8 },
  },
  intermedio: {
    compound: { min: 10, target: 12, max: 16 },
    shoulders: { min: 6, target: 8, max: 12 },
    small: { min: 6, target: 8, max: 12 },
    core: { min: 4, target: 6, max: 10 },
  },
  avanzato: {
    compound: { min: 12, target: 14, max: 18 },
    shoulders: { min: 8, target: 10, max: 14 },
    small: { min: 7, target: 9, max: 14 },
    core: { min: 5, target: 7, max: 10 },
  },
  "bodybuilder/utente esperto": {
    compound: { min: 12, target: 16, max: 22 },
    shoulders: { min: 10, target: 12, max: 16 },
    small: { min: 8, target: 12, max: 16 },
    core: { min: 6, target: 8, max: 12 },
  },
};

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToNearestSet(value: number) {
  return Math.max(0, Math.round(value));
}

function getWeeklyTrainingDays(profile: QuestionnaireProfile) {
  return clamp(profile.trainingAvailability.daysPerWeek ?? 3, 2, 6);
}

function parseSessionDurationMinutes(value: string | null) {
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

  return clamp(
    Math.round(parsed.reduce((sum, entry) => sum + entry, 0) / parsed.length),
    30,
    120
  );
}

function includesAny(text: string, matches: string[]) {
  return matches.some((entry) => text.includes(entry));
}

function hasMeaningfulLimitations(profile: QuestionnaireProfile) {
  return Boolean(
    profile.limitations.medicalCondition ||
      profile.limitations.recurringPain ||
      profile.limitations.movementsToAvoid ||
      profile.limitations.injuryNotes ||
      profile.limitations.exercisesToAvoid
  );
}

function getRecoveryStatus(profile: QuestionnaireProfile) {
  const recoveryText = normalizeText(
    [
      profile.trainingAvailability.perceivedRecovery,
      profile.trainingAvailability.sleepQuality,
      profile.trainingAvailability.stressLevel,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const limitationPenalty = hasMeaningfulLimitations(profile);

  if (
    limitationPenalty ||
    includesAny(recoveryText, [
      "scarso",
      "basso",
      "alto stress",
      "stress alto",
      "pessima",
      "male",
      "interrotto",
      "difficile",
      "poco",
    ])
  ) {
    return "low" satisfies RecoveryStatus;
  }

  if (
    includesAny(recoveryText, [
      "ottimo",
      "buono",
      "buona",
      "recupero facile",
      "energia alta",
      "stress basso",
    ])
  ) {
    return "high" satisfies RecoveryStatus;
  }

  return "moderate" satisfies RecoveryStatus;
}

function getFocusMuscles(profile: QuestionnaireProfile) {
  const priorities = profile.muscleFocus.priorities.filter(
    (entry) => entry !== "Nessuno"
  );
  const muscles = new Set<StrategyMuscleKey>();

  for (const priority of priorities) {
    for (const muscle of FOCUS_TO_MUSCLES[priority] ?? []) {
      muscles.add(muscle);
    }
  }

  return [...muscles];
}

function getGoalVolumeMultiplier(
  goal: QuestionnaireProfile["goal"]["primary"],
  muscle: StrategyMuscleKey
) {
  switch (goal) {
    case "massa muscolare":
      return muscle === "deltoidi laterali" ||
        muscle === "deltoidi posteriori" ||
        muscle === "bicipiti" ||
        muscle === "tricipiti"
        ? 1.2
        : 1.15;
    case "forza":
      return muscle === "petto" ||
        muscle === "dorso" ||
        muscle === "quadricipiti" ||
        muscle === "femorali" ||
        muscle === "glutei" ||
        muscle === "core"
        ? 0.95
        : 0.78;
    case "dimagrimento":
      return 0.88;
    case "ricomposizione":
      return 1;
    case "performance atletica":
      return muscle === "glutei" ||
        muscle === "quadricipiti" ||
        muscle === "femorali" ||
        muscle === "core"
        ? 1
        : 0.9;
    case "mobilita/postura":
      return muscle === "core" ||
        muscle === "deltoidi posteriori" ||
        muscle === "glutei"
        ? 0.9
        : 0.7;
    case "salute/mantenimento":
    case "altro":
    default:
      return 0.8;
  }
}

function getRecoveryVolumeMultiplier(
  profile: QuestionnaireProfile,
  recoveryStatus: RecoveryStatus
) {
  let multiplier = 1;

  if (recoveryStatus === "low") {
    multiplier *= 0.82;
  } else if (recoveryStatus === "moderate") {
    multiplier *= 0.93;
  }

  if (
    profile.goal.primary === "dimagrimento" &&
    profile.goal.pace === "Aggressivo solo se sicuro"
  ) {
    multiplier *= 0.92;
  }

  if (hasMeaningfulLimitations(profile)) {
    multiplier *= 0.9;
  }

  return multiplier;
}

function addWarning(warnings: string[], warning: string) {
  if (!warnings.includes(warning)) {
    warnings.push(warning);
  }
}

function buildSessionThemes(
  splitType: StrategySplitType,
  weeklyResistanceSessions: number,
  focusMuscles: StrategyMuscleKey[],
  goal: QuestionnaireProfile["goal"]["primary"]
) {
  const focusLabel = focusMuscles[0];
  const specializationNote = focusLabel
    ? `Richiamo extra su ${focusLabel}.`
    : "Richiamo extra tecnico su gruppi prioritari.";

  switch (splitType) {
    case "full_body":
      return [
        {
          dayIndex: 1,
          title: "Full Body A",
          focus: ["quadricipiti", "petto", "dorso", "core"],
          secondaryFocus: ["spalle", "tricipiti"],
          notes: ["Asse tecnico completo con volume prudente."],
        },
        {
          dayIndex: 2,
          title: "Full Body B",
          focus: ["glutei", "femorali", "dorso", "spalle"],
          secondaryFocus: ["bicipiti", "core"],
          notes: ["Seconda esposizione globale senza ripetere tutto uguale."],
        },
        ...(weeklyResistanceSessions >= 3
          ? [
              {
                dayIndex: 3,
                title: "Full Body C",
                focus: focusLabel
                  ? [focusLabel, "petto", "dorso"]
                  : ["petto", "dorso", "quadricipiti"],
                secondaryFocus: ["deltoidi posteriori", "core"],
                notes: [
                  focusLabel
                    ? `Seduta di richiamo con focus semplice su ${focusLabel}.`
                    : "Terza seduta di richiamo e consolidamento.",
                ],
              },
            ]
          : []),
      ];
    case "upper_lower":
      return [
        {
          dayIndex: 1,
          title: "Upper A",
          focus: ["petto", "dorso", "spalle"],
          secondaryFocus: ["tricipiti", "bicipiti"],
          notes: ["Spinta e tirata principali in equilibrio."],
        },
        {
          dayIndex: 2,
          title: "Lower A",
          focus: ["quadricipiti", "glutei", "core"],
          secondaryFocus: ["polpacci", "femorali"],
          notes: ["Base lower con enfasi quad dominante."],
        },
        ...(weeklyResistanceSessions >= 3
          ? [
              {
                dayIndex: 3,
                title: weeklyResistanceSessions === 3 ? "Full Body Focus" : "Upper B",
                focus:
                  weeklyResistanceSessions === 3
                    ? focusLabel
                      ? [focusLabel, "dorso", "core"]
                      : ["petto", "dorso", "core"]
                    : ["dorso", "petto", "deltoidi posteriori"],
                secondaryFocus:
                  weeklyResistanceSessions === 3
                    ? ["spalle", "bicipiti"]
                    : ["bicipiti", "tricipiti"],
                notes: [
                  weeklyResistanceSessions === 3
                    ? "Terza seduta ibrida per mantenere frequenza 2x sui principali."
                    : "Variante upper senza duplicare la prima seduta.",
                ],
              },
            ]
          : []),
        ...(weeklyResistanceSessions >= 4
          ? [
              {
                dayIndex: 4,
                title: "Lower B",
                focus: ["femorali", "glutei", "quadricipiti"],
                secondaryFocus: ["polpacci", "core"],
                notes: ["Secondo lower con posterior chain piu marcata."],
              },
            ]
          : []),
      ];
    case "push_pull_legs":
      return [
        {
          dayIndex: 1,
          title: "Push A",
          focus: ["petto", "spalle", "tricipiti"],
          secondaryFocus: ["deltoidi laterali"],
          notes: ["Spinte con priorita al pattern principale."],
        },
        {
          dayIndex: 2,
          title: "Pull A",
          focus: ["dorso", "bicipiti", "deltoidi posteriori"],
          secondaryFocus: ["core"],
          notes: ["Tirate e lavoro posteriore ordinato."],
        },
        {
          dayIndex: 3,
          title: "Legs A",
          focus: ["quadricipiti", "glutei", "femorali"],
          secondaryFocus: ["polpacci", "core"],
          notes: ["Prima esposizione lower completa."],
        },
        {
          dayIndex: 4,
          title: "Push B",
          focus: focusLabel
            ? [focusLabel, "petto", "spalle"]
            : ["petto", "spalle", "tricipiti"],
          secondaryFocus: ["tricipiti", "deltoidi laterali"],
          notes: [specializationNote],
        },
        {
          dayIndex: 5,
          title: "Pull B",
          focus: ["dorso", "deltoidi posteriori", "bicipiti"],
          secondaryFocus: ["core"],
          notes: ["Seconda esposizione dorsale e braccia."],
        },
        {
          dayIndex: 6,
          title: "Legs B",
          focus: ["glutei", "femorali", "quadricipiti"],
          secondaryFocus: ["polpacci", "core"],
          notes: ["Seconda esposizione lower con accento posterior chain."],
        },
      ];
    case "ppl_upper_lower":
      return [
        {
          dayIndex: 1,
          title: "Push",
          focus: ["petto", "spalle", "tricipiti"],
          secondaryFocus: ["deltoidi laterali"],
          notes: ["Seduta push essenziale, senza dispersione."],
        },
        {
          dayIndex: 2,
          title: "Pull",
          focus: ["dorso", "bicipiti", "deltoidi posteriori"],
          secondaryFocus: ["core"],
          notes: ["Seduta pull con volume dorsale strutturato."],
        },
        {
          dayIndex: 3,
          title: "Legs",
          focus: ["quadricipiti", "glutei", "femorali"],
          secondaryFocus: ["polpacci", "core"],
          notes: ["Seduta lower principale della settimana."],
        },
        {
          dayIndex: 4,
          title: "Upper Focus",
          focus: focusLabel
            ? [focusLabel, "petto", "dorso"]
            : ["petto", "dorso", "spalle"],
          secondaryFocus: ["bicipiti", "tricipiti"],
          notes: [specializationNote],
        },
        {
          dayIndex: 5,
          title: "Lower Focus",
          focus: ["glutei", "femorali", "quadricipiti"],
          secondaryFocus: ["polpacci", "core"],
          notes: ["Richiamo lower per aumentare qualita e frequenza."],
        },
      ];
    case "body_part_split":
      return [
        {
          dayIndex: 1,
          title: "Chest",
          focus: ["petto", "tricipiti"],
          secondaryFocus: ["spalle"],
          notes: ["Monofrequenza tecnica, volume concentrato."],
        },
        {
          dayIndex: 2,
          title: "Back",
          focus: ["dorso", "bicipiti", "deltoidi posteriori"],
          secondaryFocus: ["core"],
          notes: ["Seduta dorsale dedicata."],
        },
        {
          dayIndex: 3,
          title: "Legs",
          focus: ["quadricipiti", "glutei", "femorali"],
          secondaryFocus: ["polpacci", "core"],
          notes: ["Seduta lower dedicata e sostenibile."],
        },
        {
          dayIndex: 4,
          title: "Shoulders",
          focus: ["spalle", "deltoidi laterali", "deltoidi posteriori"],
          secondaryFocus: ["tricipiti"],
          notes: ["Lavoro deltoidi separato per utente esperto."],
        },
        {
          dayIndex: 5,
          title: focusLabel ? `Arms + ${focusLabel}` : "Arms",
          focus: focusLabel
            ? ["bicipiti", "tricipiti", focusLabel]
            : ["bicipiti", "tricipiti"],
          secondaryFocus: ["core"],
          notes: [specializationNote],
        },
        ...(weeklyResistanceSessions >= 6
          ? [
              {
                dayIndex: 6,
                title: "Specialization",
                focus: focusLabel
                  ? [focusLabel, "core"]
                  : ["dorso", "core"],
                secondaryFocus: ["polpacci"],
                notes: ["Sesta seduta solo se tollerata e coerente col recupero."],
              },
            ]
          : []),
      ];
    case "hybrid_specialization":
    default:
      return [
        {
          dayIndex: 1,
          title: "Upper A",
          focus: ["petto", "dorso", "spalle"],
          secondaryFocus: ["tricipiti", "bicipiti"],
          notes: ["Prima base upper in multifrequenza selettiva."],
        },
        {
          dayIndex: 2,
          title: "Lower A",
          focus: ["quadricipiti", "glutei", "core"],
          secondaryFocus: ["femorali", "polpacci"],
          notes: ["Base lower con volume principale."],
        },
        {
          dayIndex: 3,
          title: focusLabel ? `${focusLabel} Focus` : "Specialization",
          focus: focusLabel ? [focusLabel] : ["dorso", "spalle"],
          secondaryFocus: focusLabel ? ["core", "deltoidi posteriori"] : ["core"],
          notes: [specializationNote],
        },
        {
          dayIndex: 4,
          title: "Upper B",
          focus: ["dorso", "petto", "deltoidi posteriori"],
          secondaryFocus: ["bicipiti", "tricipiti"],
          notes: ["Seconda upper per frequenza 2x sui principali."],
        },
        ...(weeklyResistanceSessions >= 5
          ? [
              {
                dayIndex: 5,
                title: "Lower B",
                focus: ["femorali", "glutei", "quadricipiti"],
                secondaryFocus: ["polpacci", "core"],
                notes: ["Seconda lower ordinata e non casuale."],
              },
            ]
          : []),
        ...(weeklyResistanceSessions >= 6
          ? [
              {
                dayIndex: 6,
                title: "Pump / Weak Point",
                focus: focusLabel
                  ? [focusLabel, "bicipiti", "tricipiti"]
                  : ["deltoidi laterali", "bicipiti", "tricipiti"],
                secondaryFocus: ["core"],
                notes: ["Seduta breve di specializzazione solo se recuperabile."],
              },
            ]
          : []),
      ];
  }
}

function getPreferenceDrivenSplit(
  profile: QuestionnaireProfile,
  weeklyTrainingDays: number,
  recoveryStatus: RecoveryStatus,
  focusMuscles: StrategyMuscleKey[]
) {
  const preference = normalizeText(profile.splitPreference.preference);
  const isBeginnerAbsolute =
    profile.experience.level === "principiante assoluto";
  const isAdvanced =
    profile.experience.level === "avanzato" ||
    profile.experience.level === "bodybuilder/utente esperto";

  if (preference.includes("focus su gruppo carente") && focusMuscles.length > 0) {
    return weeklyTrainingDays >= 4 ? "hybrid_specialization" : "full_body";
  }

  if (
    preference.includes("monofrequenza") &&
    isAdvanced &&
    weeklyTrainingDays >= 5 &&
    recoveryStatus !== "low"
  ) {
    return "body_part_split";
  }

  if (preference.includes("push/pull/legs")) {
    if (weeklyTrainingDays >= 6 && !isBeginnerAbsolute) {
      return "push_pull_legs";
    }

    if (weeklyTrainingDays >= 5 && !isBeginnerAbsolute) {
      return "ppl_upper_lower";
    }
  }

  if (preference.includes("upper/lower")) {
    if (weeklyTrainingDays >= 4) {
      return "upper_lower";
    }

    if (weeklyTrainingDays === 3 && !isBeginnerAbsolute) {
      return "upper_lower";
    }
  }

  if (preference.includes("full body")) {
    if (weeklyTrainingDays <= 3 || recoveryStatus === "low") {
      return "full_body";
    }
  }

  if (preference.includes("multifrequenza") && weeklyTrainingDays >= 5) {
    return focusMuscles.length > 0
      ? "hybrid_specialization"
      : "ppl_upper_lower";
  }

  return null;
}

export function getRecommendedSplit(
  profile: QuestionnaireProfile
): TrainingStrategy["split"] {
  const weeklyTrainingDays = getWeeklyTrainingDays(profile);
  const sessionDurationMinutes = parseSessionDurationMinutes(
    profile.trainingAvailability.sessionDuration
  );
  const recoveryStatus = getRecoveryStatus(profile);
  const focusMuscles = getFocusMuscles(profile);
  const warnings: string[] = [];
  const preferred = getPreferenceDrivenSplit(
    profile,
    weeklyTrainingDays,
    recoveryStatus,
    focusMuscles
  );

  let type: StrategySplitType;
  let weeklyResistanceSessions = weeklyTrainingDays;
  let reason: string;

  if (preferred) {
    type = preferred;
    reason = `Preferenza split considerata: ${profile.splitPreference.preference}.`;
  } else {
    switch (profile.experience.level) {
      case "principiante assoluto":
        if (weeklyTrainingDays <= 3) {
          type = "full_body";
          weeklyResistanceSessions = weeklyTrainingDays;
          reason =
            "Principiante assoluto: full body per ripetere i pattern principali 2-3 volte senza frammentare troppo.";
          break;
        }

        type = "upper_lower";
        weeklyResistanceSessions = 4;
        reason =
          "Principiante assoluto con 4+ giorni: upper/lower semplice per distribuire meglio fatica e apprendimento.";
        break;
      case "principiante con esperienza":
        if (weeklyTrainingDays <= 3) {
          type = sessionDurationMinutes >= 65 ? "upper_lower" : "full_body";
          weeklyResistanceSessions = 3;
          reason =
            type === "upper_lower"
              ? "Principiante con esperienza e 3 giorni: ibrido upper/lower/full per evitare full body casuale."
              : "Principiante con esperienza e 3 giorni: full body ordinata e sostenibile.";
          break;
        }

        if (weeklyTrainingDays === 4) {
          type = "upper_lower";
          weeklyResistanceSessions = 4;
          reason =
            "Principiante con esperienza e 4 giorni: upper/lower come base tecnica prudente.";
          break;
        }

        type = "hybrid_specialization";
        weeklyResistanceSessions = 4;
        reason =
          "Quinto giorno usato meglio come cardio o recupero attivo; la parte pesi resta su 4 sedute strutturate con richiamo leggero.";
        addWarning(
          warnings,
          "Disponibilita alta ma esperienza ancora iniziale: la progressione deve restare prudente."
        );
        break;
      case "intermedio":
        if (weeklyTrainingDays === 3) {
          type =
            sessionDurationMinutes >= 65 || focusMuscles.length > 0
              ? "upper_lower"
              : "full_body";
          weeklyResistanceSessions = 3;
          reason =
            type === "upper_lower"
              ? "Intermedio con 3 giorni: struttura upper/lower/full per mantenere qualita e frequenza 2x sui principali."
              : "Intermedio con 3 giorni: full body evoluta, non full body mista casuale.";
          break;
        }

        if (weeklyTrainingDays === 4) {
          type = "upper_lower";
          weeklyResistanceSessions = 4;
          reason =
            "Intermedio con 4 giorni: upper/lower resta il compromesso tecnico piu stabile.";
          break;
        }

        if (weeklyTrainingDays === 5) {
          type = focusMuscles.length > 0 ? "hybrid_specialization" : "ppl_upper_lower";
          weeklyResistanceSessions = 5;
          reason =
            type === "hybrid_specialization"
              ? "Intermedio con focus muscolari: ibrido con specializzazione per alzare volume e frequenza dove serve."
              : "Intermedio con 5 giorni: PPL modificato o upper/lower + focus, senza dispersione.";
          break;
        }

        type = recoveryStatus === "low" ? "hybrid_specialization" : "push_pull_legs";
        weeklyResistanceSessions = recoveryStatus === "low" ? 5 : 6;
        reason =
          type === "push_pull_legs"
            ? "Intermedio con 6 giorni e recupero sufficiente: PPL coerente con multifrequenza 2x."
            : "Intermedio con recupero non ottimale: meglio ibrido con un po' meno densita neurale.";
        break;
      case "avanzato":
        if (weeklyTrainingDays <= 4) {
          type = focusMuscles.length > 0 ? "hybrid_specialization" : "upper_lower";
          weeklyResistanceSessions = 4;
          reason =
            type === "hybrid_specialization"
              ? "Avanzato con focus specifici: ibrido 4 giorni per alzare frequenza selettiva."
              : "Avanzato con 4 giorni: upper/lower evoluto, piu facile da recuperare bene.";
          break;
        }

        if (weeklyTrainingDays === 5) {
          if (
            normalizeText(profile.splitPreference.preference).includes("monofrequenza")
          ) {
            type = "body_part_split";
          } else {
            type = focusMuscles.length > 0 ? "hybrid_specialization" : "ppl_upper_lower";
          }
          weeklyResistanceSessions = 5;
          reason =
            type === "body_part_split"
              ? "Avanzato con preferenza monofrequenza: split dedicata per distretti."
              : "Avanzato con 5 giorni: ibrido o PPL modificato per mantenere qualita e focus.";
          break;
        }

        type =
          recoveryStatus === "low"
            ? "hybrid_specialization"
            : "push_pull_legs";
        weeklyResistanceSessions =
          recoveryStatus === "low" ? 5 : 6;
        reason =
          type === "push_pull_legs"
            ? "Avanzato con 6 giorni: PPL o multifrequenza selettiva piena."
            : "Recupero non ideale: si riduce la densita pur mantenendo alta la frequenza dei focus.";
        break;
      case "bodybuilder/utente esperto":
      default:
        if (weeklyTrainingDays <= 3) {
          type = "hybrid_specialization";
          weeklyResistanceSessions = 3;
          reason =
            "Utente esperto con pochi giorni: meglio specializzare e comprimere, evitando una full body generica.";
          break;
        }

        if (weeklyTrainingDays === 4) {
          type = focusMuscles.length > 0 ? "hybrid_specialization" : "upper_lower";
          weeklyResistanceSessions = 4;
          reason =
            type === "hybrid_specialization"
              ? "Esperto con 4 giorni e carenze dichiarate: specializzazione mirata."
              : "Esperto con 4 giorni: upper/lower evoluto ancora efficiente.";
          break;
        }

        if (weeklyTrainingDays === 5) {
          type =
            normalizeText(profile.splitPreference.preference).includes("monofrequenza") ||
            recoveryStatus === "high"
              ? "body_part_split"
              : "hybrid_specialization";
          weeklyResistanceSessions = 5;
          reason =
            type === "body_part_split"
              ? "Esperto con 5 giorni: body part split coerente con preferenze e volume dedicato."
              : "Esperto con 5 giorni: ibrido di specializzazione piu adatto alle carenze.";
          break;
        }

        type =
          normalizeText(profile.splitPreference.preference).includes("monofrequenza")
            ? "body_part_split"
            : focusMuscles.length > 0
              ? "hybrid_specialization"
              : "push_pull_legs";
        weeklyResistanceSessions = type === "body_part_split" ? 6 : 6;
        reason =
          type === "body_part_split"
            ? "Esperto con 6 giorni e preferenza dedicata: monofrequenza o split specialistica dosata."
            : type === "hybrid_specialization"
              ? "Esperto con focus carenti: multifrequenza selettiva sopra la semplice PPL."
              : "Esperto con 6 giorni: PPL piena come base stabile.";
        break;
    }
  }

  if (!preferred) {
    weeklyResistanceSessions =
      typeof weeklyResistanceSessions === "number"
        ? weeklyResistanceSessions
        : weeklyTrainingDays;
  } else {
    switch (type) {
      case "full_body":
        weeklyResistanceSessions = Math.min(weeklyTrainingDays, 3);
        break;
      case "upper_lower":
        weeklyResistanceSessions = weeklyTrainingDays >= 4 ? 4 : 3;
        break;
      case "push_pull_legs":
        weeklyResistanceSessions = weeklyTrainingDays >= 6 ? 6 : 5;
        break;
      case "ppl_upper_lower":
        weeklyResistanceSessions = 5;
        break;
      case "body_part_split":
        weeklyResistanceSessions = weeklyTrainingDays >= 6 ? 6 : 5;
        break;
      case "hybrid_specialization":
      default:
        weeklyResistanceSessions = weeklyTrainingDays >= 5 ? 5 : 4;
        break;
    }
  }

  if (recoveryStatus === "low" && weeklyResistanceSessions >= 6) {
    weeklyResistanceSessions = 5;
    addWarning(
      warnings,
      "Recupero percepito basso: ridotta la densita della parte pesi rispetto alla disponibilita settimanale."
    );
  }

  if (sessionDurationMinutes < 50 && weeklyResistanceSessions >= 5) {
    addWarning(
      warnings,
      "Sedute brevi con split complessa: servira selezione esercizi molto essenziale."
    );
  }

  weeklyResistanceSessions = clamp(
    weeklyResistanceSessions,
    1,
    weeklyTrainingDays
  );
  const sessionThemes = buildSessionThemes(
    type,
    weeklyResistanceSessions,
    focusMuscles,
    profile.goal.primary
  ).slice(0, weeklyResistanceSessions);

  return {
    type,
    reason,
    weeklyResistanceSessions,
    sessionThemes,
  };
}

export function getWeeklyVolumeTargets(
  profile: QuestionnaireProfile
): TrainingStrategy["volume"] {
  const recoveryStatus = getRecoveryStatus(profile);
  const focusMuscles = getFocusMuscles(profile);
  const levelBase = LEVEL_BASE_TARGETS[profile.experience.level];
  const recoveryMultiplier = getRecoveryVolumeMultiplier(profile, recoveryStatus);
  const focusBoosts: string[] = [];
  const weeklySetsByMuscle = {} as Record<StrategyMuscleKey, WeeklySetTarget>;
  const deloadRecommended =
    recoveryStatus === "low" &&
    (profile.experience.level === "avanzato" ||
      profile.experience.level === "bodybuilder/utente esperto");

  for (const muscle of MUSCLE_KEYS) {
    const tier = MUSCLE_VOLUME_TIERS[muscle];
    const base = levelBase[tier];
    const goalMultiplier = getGoalVolumeMultiplier(profile.goal.primary, muscle);
    const adjustedMin = roundToNearestSet(base.min * goalMultiplier * recoveryMultiplier);
    let adjustedTarget = roundToNearestSet(
      base.target * goalMultiplier * recoveryMultiplier
    );
    const adjustedMax = Math.max(
      adjustedTarget,
      roundToNearestSet(base.max * goalMultiplier * Math.max(recoveryMultiplier, 0.9))
    );

    if (focusMuscles.includes(muscle)) {
      const boostedTarget = roundToNearestSet(adjustedTarget * 1.25);
      adjustedTarget = Math.min(boostedTarget, Math.max(adjustedTarget + 1, adjustedMax));
      focusBoosts.push(`${muscle}: target alzato per priorita dichiarata.`);
    }

    const reasonParts = [
      `Base ${profile.experience.level}.`,
      `Obiettivo ${profile.goal.primary}.`,
    ];

    if (focusMuscles.includes(muscle)) {
      reasonParts.push("Boost focus 20-30% circa.");
    }

    if (recoveryStatus !== "high") {
      reasonParts.push(
        recoveryStatus === "low"
          ? "Volume ridotto per recupero/limitazioni."
          : "Volume moderato per sostenibilita."
      );
    }

    weeklySetsByMuscle[muscle] = {
      min: Math.max(2, adjustedMin),
      target: Math.max(Math.max(2, adjustedMin), adjustedTarget),
      max: Math.max(Math.max(3, adjustedTarget), adjustedMax),
      reason: reasonParts.join(" "),
    };
  }

  return {
    weeklySetsByMuscle,
    focusBoosts,
    deloadRecommended,
  };
}

export function getMuscleFrequencyTargets(
  profile: QuestionnaireProfile
): TrainingStrategy["frequency"] {
  const split = getRecommendedSplit(profile);
  const focusMuscles = getFocusMuscles(profile);
  const frequency = {} as Record<StrategyMuscleKey, number>;

  for (const muscle of MUSCLE_KEYS) {
    let baseFrequency = 2;

    switch (split.type) {
      case "full_body":
        baseFrequency =
          split.weeklyResistanceSessions >= 3 &&
          (muscle === "petto" ||
            muscle === "dorso" ||
            muscle === "quadricipiti" ||
            muscle === "glutei" ||
            muscle === "core")
            ? 3
            : 2;
        break;
      case "upper_lower":
        baseFrequency =
          muscle === "core" || muscle === "polpacci"
            ? 2
            : split.weeklyResistanceSessions >= 4
              ? 2
              : muscle === "petto" ||
                  muscle === "dorso" ||
                  muscle === "quadricipiti" ||
                  muscle === "glutei"
                ? 2
                : 1;
        break;
      case "push_pull_legs":
      case "ppl_upper_lower":
        baseFrequency = muscle === "core" ? 2 : 2;
        break;
      case "body_part_split":
        baseFrequency =
          muscle === "core" || muscle === "polpacci" ? 2 : 1;
        break;
      case "hybrid_specialization":
      default:
        baseFrequency =
          muscle === "core"
            ? 2
            : muscle === "petto" ||
                muscle === "dorso" ||
                muscle === "quadricipiti" ||
                muscle === "glutei" ||
                muscle === "femorali"
              ? 2
              : 1;
        break;
    }

    if (focusMuscles.includes(muscle) && baseFrequency < 3) {
      baseFrequency += 1;
    }

    frequency[muscle] = baseFrequency;
  }

  return {
    muscleFrequencyByMuscle: frequency,
    reason:
      split.type === "body_part_split"
        ? "Monofrequenza possibile solo dove coerente; i gruppi prioritari mantengono richiami selettivi."
        : "Frequenza alzata sui principali e sui focus, evitando di mettere tutto in tutte le sedute.",
  };
}

function getPreferredCardioModalities(profile: QuestionnaireProfile) {
  const requested = profile.cardio.preferences;
  const equipment = profile.cardio.equipmentAvailable;
  const impactTolerance = normalizeText(profile.cardio.impactTolerance);
  const limitationsText = normalizeText(
    [
      profile.limitations.recurringPain,
      profile.limitations.movementsToAvoid,
      profile.limitations.exercisesToAvoid,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const avoidHighImpact =
    impactTolerance.includes("bassa") ||
    impactTolerance.includes("no impatto") ||
    includesAny(limitationsText, ["ginocchi", "schiena", "salti", "impatto"]);
  const lowImpactPreferred = [
    "Camminata",
    "Tapis roulant inclinato",
    "Bike/Cyclette",
    "Vogatore",
    "Stair climber",
  ];
  const highImpact = ["Corsa", "HIIT", "Circuiti"];
  const source = requested.length > 0 ? requested : equipment;

  const filtered = source.filter((entry) =>
    avoidHighImpact ? !highImpact.includes(entry) : true
  );

  if (filtered.length > 0) {
    return filtered.slice(0, 3);
  }

  return avoidHighImpact ? lowImpactPreferred.slice(0, 3) : ["Camminata", "Bike/Cyclette", "Sport"];
}

export function getCardioStrategy(
  profile: QuestionnaireProfile
): TrainingStrategy["cardio"] {
  const weeklyTrainingDays = getWeeklyTrainingDays(profile);
  const split = getRecommendedSplit(profile);
  const recoveryStatus = getRecoveryStatus(profile);
  const modalities = getPreferredCardioModalities(profile);
  const separateDaysAvailable =
    weeklyTrainingDays > split.weeklyResistanceSessions;
  const timingPreference = normalizeText(profile.cardio.timingPreference);

  let weeklySessions = 2;
  let minutesPerSession = 20;
  let intensity: TrainingStrategy["cardio"]["intensity"] = "low";
  let placement: TrainingStrategy["cardio"]["placement"] =
    separateDaysAvailable ? "separate_days" : "after_weights";
  let reason = "Cardio presente per supportare salute, recupero e capacita di lavoro.";

  switch (profile.goal.primary) {
    case "dimagrimento":
      weeklySessions = weeklyTrainingDays >= 4 ? (weeklyTrainingDays >= 5 ? 3 : 2) : 2;
      minutesPerSession = recoveryStatus === "low" ? 25 : 30;
      intensity =
        recoveryStatus === "high" && modalities.includes("HIIT") ? "mixed" : "low";
      reason =
        "Dimagrimento: piu frequenza cardio con focus su LISS, zone 2 o opzioni low impact.";
      break;
    case "massa muscolare":
      weeklySessions = weeklyTrainingDays >= 5 ? 2 : weeklyTrainingDays >= 4 ? 1 : 1;
      minutesPerSession = 15;
      intensity = "low";
      placement = "after_weights";
      reason =
        "Massa muscolare: cardio presente ma dosato per non interferire troppo con gambe e recupero.";
      break;
    case "forza":
      weeklySessions = 1;
      minutesPerSession = 15;
      intensity = "low";
      placement = "after_weights";
      reason =
        "Forza: conditioning leggero e a basso impatto per supporto aerobico senza rubare risorse ai fondamentali.";
      break;
    case "salute/mantenimento":
    case "mobilita/postura":
      weeklySessions = weeklyTrainingDays >= 4 ? 2 : 1;
      minutesPerSession = 25;
      intensity = "moderate";
      reason =
        "Salute/mantenimento: componente cardio coerente con linee guida generali e preferenze dell'utente.";
      break;
    case "performance atletica":
      weeklySessions = weeklyTrainingDays >= 5 ? 3 : 2;
      minutesPerSession = 20;
      intensity = recoveryStatus === "high" ? "mixed" : "moderate";
      reason =
        "Performance atletica: alternanza di base aerobica e richiami piu brillanti solo se recuperabili.";
      break;
    case "ricomposizione":
    case "altro":
    default:
      weeklySessions = weeklyTrainingDays >= 4 ? 2 : 1;
      minutesPerSession = 20;
      intensity = recoveryStatus === "low" ? "low" : "moderate";
      reason =
        "Ricomposizione o obiettivo generico: cardio moderato per supportare dispendio, salute e recupero.";
      break;
  }

  if (recoveryStatus === "low") {
    if (profile.goal.primary === "massa muscolare" || profile.goal.primary === "forza") {
      weeklySessions = Math.min(weeklySessions, 1);
      minutesPerSession = Math.min(minutesPerSession, 15);
      placement = "after_weights";
    } else {
      weeklySessions = Math.max(1, weeklySessions - 1);
      minutesPerSession = Math.min(minutesPerSession, 25);
    }
    intensity = "low";
    modalities.splice(0, modalities.length, ...modalities.filter((entry) => entry !== "HIIT"));
    if (modalities.length === 0) {
      modalities.push("Camminata", "Bike/Cyclette");
    }
    reason = `${reason} Recupero basso: meglio cardio leggero e piu NEAT/camminata.`;
  }

  if (timingPreference.includes("giorni separati") && separateDaysAvailable) {
    placement = "separate_days";
  } else if (timingPreference.includes("dopo")) {
    placement = "after_weights";
  } else if (!separateDaysAvailable) {
    placement = "mixed";
  }

  return {
    weeklySessions,
    preferredModalities: modalities.slice(0, 3),
    intensity,
    minutesPerSession,
    placement,
    reason,
  };
}

export function getAdvancedTechniquePolicy(
  profile: QuestionnaireProfile
): TrainingStrategy["techniques"] {
  const recoveryStatus = getRecoveryStatus(profile);
  const preferenceText = normalizeText(profile.advancedTechniques.preference.join(" "));
  const limitationsPresent = hasMeaningfulLimitations(profile);
  const aggressiveDeficit =
    profile.goal.primary === "dimagrimento" &&
    profile.goal.pace === "Aggressivo solo se sicuro";
  const allowed = new Set<string>();
  const excluded = new Set<string>([
    "Drop set",
    "Rest-pause",
    "Myo-reps",
    "Cluster",
    "Stripping/metaboliche",
  ]);
  let reason = "";

  if (profile.advancedTechniques.preference.includes("Non voglio tecniche avanzate")) {
    return {
      allowed: [],
      excluded: [
        ...excluded,
        "Superserie",
        "Superserie leggere",
        "Superserie antagoniste",
        "Top set + back-off",
        "Tempo controllato",
        "Pause semplici",
        "Pausa in allungamento/contrazione",
        "Doppia progressione",
        "Back-off set",
        "Ramping controllato",
        "Rest-pause controllato",
        "Myo-reps leggere",
        "Set di specializzazione su isolamento",
      ],
      reason: "Preferenza esplicita dell'utente: niente tecniche avanzate.",
    };
  }

  switch (profile.experience.level) {
    case "principiante assoluto":
      reason =
        "Principiante assoluto: priorita a tecnica, stabilita e lettura dello sforzo. Tecniche avanzate escluse.";
      return {
        allowed: ["Tempo controllato"],
        excluded: [
          "Superserie",
          "Superserie leggere",
          "Superserie antagoniste",
          "Top set + back-off",
          "Pause semplici",
          "Pausa in allungamento/contrazione",
          "Doppia progressione",
          "Back-off set",
          "Ramping controllato",
          "Rest-pause controllato",
          "Myo-reps leggere",
          "Set di specializzazione su isolamento",
          ...excluded,
        ],
        reason,
      };
    case "principiante con esperienza":
      allowed.add("Tempo controllato");
      allowed.add("Pause semplici");
      allowed.add("Pausa in allungamento/contrazione");
      allowed.add("Doppia progressione");
      excluded.add("Superserie");
      excluded.add("Superserie leggere");
      reason =
        "Principiante con esperienza: ammesse solo tecniche semplici e controllate, non tecniche ad alta fatica locale.";
      break;
    case "intermedio":
      allowed.add("Tempo controllato");
      allowed.add("Top set + back-off");
      allowed.add("Back-off set");
      allowed.add("Doppia progressione");
      allowed.add("Ramping controllato");
      allowed.add("Superserie leggere");
      if (preferenceText.includes("rest-pause") && recoveryStatus === "high") {
        allowed.add("Rest-pause limitato");
        allowed.add("Rest-pause controllato");
        excluded.delete("Rest-pause");
      }
      reason =
        "Intermedio: si possono usare poche tecniche utili, ma con controllo del recupero.";
      break;
    case "avanzato":
    case "bodybuilder/utente esperto":
      allowed.add("Tempo controllato");
      allowed.add("Top set + back-off");
      allowed.add("Superserie");
      allowed.add("Superserie antagoniste");
      allowed.add("Superserie leggere");
      allowed.add("Back-off set");
      allowed.add("Doppia progressione");
      allowed.add("Ramping controllato");
      allowed.add("Rest-pause controllato");
      allowed.add("Myo-reps leggere");
      allowed.add("Set di specializzazione su isolamento");
      allowed.add("Drop set");
      allowed.add("Rest-pause");
      allowed.add("Myo-reps");
      allowed.add("Cluster");
      allowed.add("Stripping/metaboliche");
      excluded.delete("Drop set");
      excluded.delete("Rest-pause");
      excluded.delete("Myo-reps");
      excluded.delete("Cluster");
      excluded.delete("Stripping/metaboliche");
      reason =
        "Profilo avanzato: tecniche avanzate consentite, ma da dosare su esercizi appropriati e fasi coerenti.";
      break;
  }

  if (recoveryStatus === "low" || aggressiveDeficit) {
    allowed.delete("Drop set");
    allowed.delete("Rest-pause");
    allowed.delete("Rest-pause controllato");
    allowed.delete("Myo-reps");
    allowed.delete("Myo-reps leggere");
    allowed.delete("Cluster");
    allowed.delete("Stripping/metaboliche");
    allowed.delete("Superserie");
    allowed.delete("Superserie antagoniste");
    excluded.add("Drop set");
    excluded.add("Rest-pause");
    excluded.add("Rest-pause controllato");
    excluded.add("Myo-reps");
    excluded.add("Myo-reps leggere");
    excluded.add("Cluster");
    excluded.add("Stripping/metaboliche");
    excluded.add("Superserie");
    excluded.add("Superserie antagoniste");
    reason = `${reason} Recupero o deficit richiedono di ridurre le tecniche piu tassanti.`;
  }

  if (limitationsPresent) {
    excluded.add("Cluster");
    excluded.add("Rest-pause");
    excluded.add("Rest-pause controllato");
    excluded.add("Drop set");
    excluded.add("Myo-reps");
    excluded.add("Myo-reps leggere");
    reason = `${reason} Limitazioni fisiche: evitare tecniche aggressive su esercizi piu rischiosi.`;
  }

  return {
    allowed: [...allowed],
    excluded: [...excluded],
    reason,
  };
}

function getIntensityStrategy(
  profile: QuestionnaireProfile
): TrainingStrategy["intensity"] {
  const recoveryStatus = getRecoveryStatus(profile);
  const aggressiveDeficit =
    profile.goal.primary === "dimagrimento" &&
    profile.goal.pace === "Aggressivo solo se sicuro";

  let defaultRir = 2;
  let rirRange: [number, number] = [1, 3];
  let failureAllowed = false;
  let failureNotes =
    "Cedimento solo se selezionato su isolamenti sicuri, non sui multiarticolari a caso.";

  switch (profile.experience.level) {
    case "principiante assoluto":
      defaultRir = 3;
      rirRange = [2, 4];
      failureAllowed = false;
      failureNotes =
        "Cedimento escluso: priorita a tecnica, confidenza e ripetibilita delle alzate.";
      break;
    case "principiante con esperienza":
      defaultRir = 3;
      rirRange = [2, 4];
      failureAllowed = false;
      failureNotes =
        "Cedimento generalmente escluso; al massimo lavoro vicino al cedimento su complementari molto stabili.";
      break;
    case "intermedio":
      defaultRir = 2;
      rirRange = [1, 3];
      failureAllowed = true;
      failureNotes =
        "Cedimento permesso solo su poche serie di isolamento o sull'ultima serie selezionata.";
      break;
    case "avanzato":
    case "bodybuilder/utente esperto":
      defaultRir = 1;
      rirRange = [0, 2];
      failureAllowed = true;
      failureNotes =
        "Cedimento dosato su esercizi adatti, non sistematico e non usato per compensare cattiva programmazione.";
      break;
  }

  if (recoveryStatus === "low" || aggressiveDeficit) {
    defaultRir += 1;
    rirRange = [Math.min(2, rirRange[0] + 1), Math.min(4, rirRange[1] + 1)];
    failureAllowed = false;
    failureNotes =
      "Recupero o fase calorica aggressiva: meglio tenere piu buffer e limitare il cedimento.";
  }

  return {
    defaultRir,
    rirRange,
    failureAllowed,
    failureNotes,
  };
}

export function buildTrainingStrategy(
  profile: QuestionnaireProfile
): TrainingStrategy {
  const weeklyTrainingDays = getWeeklyTrainingDays(profile);
  const sessionDurationMinutes = parseSessionDurationMinutes(
    profile.trainingAvailability.sessionDuration
  );
  const split = getRecommendedSplit(profile);
  const volume = getWeeklyVolumeTargets(profile);
  const frequency = getMuscleFrequencyTargets(profile);
  const cardio = getCardioStrategy(profile);
  const techniques = getAdvancedTechniquePolicy(profile);
  const intensity = getIntensityStrategy(profile);
  const warnings: string[] = [];

  if (getRecoveryStatus(profile) === "low") {
    addWarning(
      warnings,
      "Recupero dichiarato basso: volume, cardio e tecniche intense sono mantenuti piu prudenti."
    );
  }

  if (volume.deloadRecommended) {
    addWarning(
      warnings,
      "Recupero fragile su profilo avanzato: utile prevedere settimane di scarico o almeno una gestione del volume piu cauta."
    );
  }

  if (hasMeaningfulLimitations(profile)) {
    addWarning(
      warnings,
      "Sono presenti limitazioni o fastidi: la selezione esercizi dovra privilegiare varianti stabili e ben tollerate."
    );
  }

  if (
    weeklyTrainingDays >= 5 &&
    sessionDurationMinutes < 50 &&
    split.weeklyResistanceSessions >= 5
  ) {
    addWarning(
      warnings,
      "Disponibilita alta ma sedute corte: serve densita controllata e priorita rigide sugli esercizi principali."
    );
  }

  if (
    split.type === "body_part_split" &&
    profile.experience.level !== "bodybuilder/utente esperto" &&
    profile.experience.level !== "avanzato"
  ) {
    addWarning(
      warnings,
      "Body part split scelta solo come eccezione guidata dalla preferenza: monitorare se la frequenza resta sufficiente."
    );
  }

  return {
    version: 2,
    goal: profile.goal.primary,
    experienceLevel: profile.experience.level,
    weeklyTrainingDays,
    sessionDurationMinutes,
    split,
    volume,
    frequency,
    cardio,
    intensity,
    techniques,
    warnings,
  };
}

export function buildTrainingStrategySummary(strategy: TrainingStrategy) {
  const focusBoosts =
    strategy.volume.focusBoosts.length > 0
      ? strategy.volume.focusBoosts.join(" | ")
      : "Nessun boost specifico.";
  const splitLabel = formatUserFacingSplitLabel(strategy.split.type) ?? "personalizzata";
  const cardioPlacement =
    strategy.cardio.placement === "separate_days" ? "su giorni separati" : "in modo misto";

  return [
    `Obiettivo: ${strategy.goal}.`,
    `Livello: ${strategy.experienceLevel}.`,
    `Distribuzione settimanale: ${splitLabel} (${strategy.split.weeklyResistanceSessions} sedute con i pesi).`,
    "La distribuzione delle sedute e stata scelta per mantenere equilibrio, recupero e continuita.",
    `RIR base: ${strategy.intensity.defaultRir} (range ${strategy.intensity.rirRange[0]}-${strategy.intensity.rirRange[1]}).`,
    `Intensita: ${strategy.intensity.failureAllowed ? "cedimento ammesso in modo selettivo" : "cedimento non previsto come base di lavoro"}.`,
    `Cardio previsto: ${strategy.cardio.weeklySessions} sessioni da ${strategy.cardio.minutesPerSession} minuti, con distribuzione ${cardioPlacement}.`,
    `Tecniche previste: ${strategy.techniques.allowed.length > 0 ? strategy.techniques.allowed.join(", ") : "nessuna"}.`,
    `Focus aggiuntivo: ${focusBoosts}`,
    strategy.warnings.length > 0
      ? `Attenzioni: ${strategy.warnings.join(" | ")}`
      : "Attenzioni: nessuna rilevante.",
  ].join("\n");
}

export function formatTrainingStrategySummary(strategy: TrainingStrategy) {
  return buildTrainingStrategySummary(strategy);
}
