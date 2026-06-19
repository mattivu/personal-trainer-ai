import type { ExerciseSlot } from "./exercise-selector";
import type { TrainingStrategy } from "./training-strategy";

export type AdvancedTechniqueKey =
  | "controlled_tempo"
  | "pause_in_stretch_or_peak"
  | "top_set_backoff"
  | "double_progression"
  | "light_superset"
  | "controlled_rest_pause"
  | "light_myo_reps"
  | "back_off_set"
  | "controlled_ramping"
  | "drop_set"
  | "cluster_set"
  | "myo_reps"
  | "rest_pause"
  | "antagonist_superset"
  | "metabolic_stripping"
  | "isolation_specialization_set";

export type TechniqueRiskLevel = "low" | "moderate" | "high";

type WorkoutBlueprintLike = {
  title: string;
  focus: string;
  notes: string;
  slots: ExerciseSlot[];
};

type AdvancedTechniqueDefinition = {
  key: AdvancedTechniqueKey;
  label: string;
  risk: TechniqueRiskLevel;
  aliases: string[];
};

export type AdvancedTechniqueAssignment = {
  workoutIndex: number;
  workoutTitle: string;
  slotId: string;
  technique: AdvancedTechniqueKey;
  note: string;
  risk: TechniqueRiskLevel;
};

const TECHNIQUE_DEFINITIONS: AdvancedTechniqueDefinition[] = [
  {
    key: "controlled_tempo",
    label: "Tempo controllato",
    risk: "low",
    aliases: ["Tempo controllato"],
  },
  {
    key: "pause_in_stretch_or_peak",
    label: "Pausa in allungamento/contrazione",
    risk: "low",
    aliases: ["Pause semplici", "Pausa in allungamento/contrazione"],
  },
  {
    key: "top_set_backoff",
    label: "Top set + back-off",
    risk: "moderate",
    aliases: ["Top set + back-off"],
  },
  {
    key: "double_progression",
    label: "Doppia progressione",
    risk: "low",
    aliases: ["Doppia progressione"],
  },
  {
    key: "light_superset",
    label: "Superserie leggere",
    risk: "moderate",
    aliases: ["Superserie leggere"],
  },
  {
    key: "controlled_rest_pause",
    label: "Rest-pause controllato",
    risk: "moderate",
    aliases: ["Rest-pause controllato", "Rest-pause limitato"],
  },
  {
    key: "light_myo_reps",
    label: "Myo-reps leggere",
    risk: "moderate",
    aliases: ["Myo-reps leggere"],
  },
  {
    key: "back_off_set",
    label: "Back-off set",
    risk: "low",
    aliases: ["Back-off set"],
  },
  {
    key: "controlled_ramping",
    label: "Ramping controllato",
    risk: "low",
    aliases: ["Ramping controllato"],
  },
  {
    key: "drop_set",
    label: "Drop set",
    risk: "high",
    aliases: ["Drop set"],
  },
  {
    key: "cluster_set",
    label: "Cluster set",
    risk: "high",
    aliases: ["Cluster", "Cluster set"],
  },
  {
    key: "myo_reps",
    label: "Myo-reps",
    risk: "high",
    aliases: ["Myo-reps"],
  },
  {
    key: "rest_pause",
    label: "Rest-pause",
    risk: "high",
    aliases: ["Rest-pause"],
  },
  {
    key: "antagonist_superset",
    label: "Superserie antagoniste",
    risk: "moderate",
    aliases: ["Superserie", "Superserie antagoniste"],
  },
  {
    key: "metabolic_stripping",
    label: "Stripping/metaboliche",
    risk: "high",
    aliases: ["Stripping/metaboliche"],
  },
  {
    key: "isolation_specialization_set",
    label: "Set di specializzazione su isolamento",
    risk: "moderate",
    aliases: ["Set di specializzazione su isolamento"],
  },
];

const TECHNIQUE_BY_KEY = new Map(
  TECHNIQUE_DEFINITIONS.map((definition) => [definition.key, definition])
);

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

function getTechniqueDefinition(technique: AdvancedTechniqueKey) {
  return TECHNIQUE_BY_KEY.get(technique);
}

function getTechniqueLabels(technique: AdvancedTechniqueKey) {
  return getTechniqueDefinition(technique)?.aliases.map(normalizeText) ?? [];
}

function isTechniqueExplicitlyAllowed(
  strategy: TrainingStrategy,
  technique: AdvancedTechniqueKey
) {
  const allowed = new Set(strategy.techniques.allowed.map(normalizeText));
  return getTechniqueLabels(technique).some((label) => allowed.has(label));
}

function isTechniqueExplicitlyExcluded(
  strategy: TrainingStrategy,
  technique: AdvancedTechniqueKey
) {
  const excluded = new Set(strategy.techniques.excluded.map(normalizeText));
  return getTechniqueLabels(technique).some((label) => excluded.has(label));
}

function isTechniqueOptOut(strategy: TrainingStrategy) {
  return normalizeText(strategy.techniques.reason).includes("niente tecniche avanzate");
}

function isLowRecoveryStrategy(strategy: TrainingStrategy) {
  return (
    strategy.intensity.defaultRir >= 3 ||
    strategy.warnings.some((warning) =>
      normalizeText(warning).includes("recupero")
    )
  );
}

function hasMeaningfulLimitations(strategy: TrainingStrategy) {
  const warningText = normalizeText(strategy.warnings.join(" "));
  return (
    warningText.includes("limitazioni") ||
    warningText.includes("dolore") ||
    warningText.includes("infortun") ||
    warningText.includes("fastidio")
  );
}

function slotHasCautionMarkers(slot: ExerciseSlot) {
  const cautionText = normalizeText(
    [...(slot.avoidTags ?? []), slot.notes, ...slot.targetMuscles, ...(slot.secondaryMuscles ?? [])].join(
      " "
    )
  );

  return (
    cautionText.includes("caution") ||
    cautionText.includes("spalla") ||
    cautionText.includes("schiena") ||
    cautionText.includes("ginoc")
  );
}

function isMainCompoundSlot(slot: ExerciseSlot) {
  return slot.role === "heavy_compound";
}

function isSecondaryCompoundSlot(slot: ExerciseSlot) {
  return slot.role === "compound";
}

function isAccessorySlot(slot: ExerciseSlot) {
  return slot.role === "accessory";
}

function isIsolationSlot(slot: ExerciseSlot) {
  return slot.role === "isolation";
}

function isCoreSlot(slot: ExerciseSlot) {
  return slot.role === "core";
}

function isCardioOrMobilitySlot(slot: ExerciseSlot) {
  return slot.role === "cardio" || slot.role === "mobility" || slot.category === "cardio";
}

function isRiskyMainPattern(slot: ExerciseSlot) {
  return slot.movementPatterns.some((pattern) =>
    ["squat", "hinge", "horizontal_push", "vertical_push"].includes(pattern)
  );
}

function isFocusSlot(strategy: TrainingStrategy, workout: WorkoutBlueprintLike, slot: ExerciseSlot) {
  const focusText = normalizeText(
    `${workout.title} ${workout.focus} ${strategy.volume.focusBoosts.join(" ")} ${slot.targetMuscles.join(" ")}`
  );

  return slot.targetMuscles.some((muscle) => focusText.includes(normalizeText(muscle)));
}

function getWeeklyTechniqueCaps(strategy: TrainingStrategy) {
  let total = 0;
  let moderateOrHigh = 0;
  let high = 0;
  let perWorkout = 1;

  switch (strategy.experienceLevel) {
    case "principiante assoluto":
      total = Math.min(strategy.weeklyTrainingDays, 2);
      break;
    case "principiante con esperienza":
      total = 2;
      break;
    case "intermedio":
      total = strategy.goal === "massa muscolare" ? 2 : 1;
      moderateOrHigh = 1;
      break;
    case "avanzato":
      total = strategy.goal === "massa muscolare" ? 3 : 2;
      moderateOrHigh = 2;
      high = strategy.goal === "forza" ? 1 : 2;
      perWorkout = 2;
      break;
    case "bodybuilder/utente esperto":
      total = strategy.goal === "massa muscolare" ? 4 : 3;
      moderateOrHigh = 3;
      high = strategy.goal === "forza" ? 1 : 2;
      perWorkout = 2;
      break;
  }

  if (
    strategy.goal === "dimagrimento" ||
    strategy.goal === "salute/mantenimento" ||
    strategy.goal === "mobilita/postura"
  ) {
    total = Math.min(total, 2);
    moderateOrHigh = Math.min(moderateOrHigh, 1);
    high = 0;
  }

  if (strategy.goal === "ricomposizione") {
    total = Math.min(total, 2);
    high = 0;
  }

  if (isLowRecoveryStrategy(strategy) || hasMeaningfulLimitations(strategy)) {
    total = Math.max(0, total - 1);
    moderateOrHigh = Math.min(moderateOrHigh, 1);
    high = 0;
    perWorkout = 1;
  }

  return {
    total,
    moderateOrHigh,
    high,
    perWorkout,
  };
}

function getTechniqueCandidatesForSlot(
  strategy: TrainingStrategy,
  workout: WorkoutBlueprintLike,
  slot: ExerciseSlot
) {
  if (isCardioOrMobilitySlot(slot)) {
    return [] as AdvancedTechniqueKey[];
  }

  const candidates: AdvancedTechniqueKey[] = [];

  if (strategy.goal === "forza") {
    if (isMainCompoundSlot(slot)) {
      candidates.push("top_set_backoff", "controlled_ramping", "back_off_set");
      if (
        (strategy.experienceLevel === "avanzato" ||
          strategy.experienceLevel === "bodybuilder/utente esperto") &&
        !isRiskyMainPattern(slot)
      ) {
        candidates.push("cluster_set");
      }
    } else if (isSecondaryCompoundSlot(slot)) {
      candidates.push("back_off_set", "double_progression", "controlled_tempo");
    } else if (isAccessorySlot(slot) || isIsolationSlot(slot)) {
      candidates.push("double_progression", "controlled_tempo");
    } else if (isCoreSlot(slot)) {
      candidates.push("controlled_tempo", "pause_in_stretch_or_peak");
    }

    return [...new Set(candidates)];
  }

  if (strategy.experienceLevel === "principiante assoluto") {
    if (isMainCompoundSlot(slot) || isSecondaryCompoundSlot(slot) || isCoreSlot(slot)) {
      candidates.push("controlled_tempo");
    } else if (isAccessorySlot(slot) || isIsolationSlot(slot)) {
      candidates.push("controlled_tempo", "double_progression");
    }

    return [...new Set(candidates)];
  }

  if (strategy.experienceLevel === "principiante con esperienza") {
    if (isMainCompoundSlot(slot) || isSecondaryCompoundSlot(slot)) {
      candidates.push("controlled_tempo", "double_progression");
    } else if (isAccessorySlot(slot) || isIsolationSlot(slot) || isCoreSlot(slot)) {
      candidates.push("controlled_tempo", "pause_in_stretch_or_peak", "double_progression");
    }

    return [...new Set(candidates)];
  }

  if (isMainCompoundSlot(slot)) {
    candidates.push("top_set_backoff", "controlled_ramping", "back_off_set", "double_progression");
  } else if (isSecondaryCompoundSlot(slot)) {
    candidates.push("back_off_set", "controlled_tempo", "double_progression");
  } else if (isAccessorySlot(slot)) {
    candidates.push("controlled_tempo", "light_superset", "back_off_set");
  } else if (isIsolationSlot(slot)) {
    candidates.push(
      "controlled_tempo",
      "double_progression",
      "light_superset",
      "controlled_rest_pause",
      "light_myo_reps"
    );
  } else if (isCoreSlot(slot)) {
    candidates.push("controlled_tempo", "pause_in_stretch_or_peak");
  }

  if (
    strategy.goal === "massa muscolare" &&
    (strategy.experienceLevel === "avanzato" ||
      strategy.experienceLevel === "bodybuilder/utente esperto") &&
    isFocusSlot(strategy, workout, slot) &&
    (isIsolationSlot(slot) || isAccessorySlot(slot))
  ) {
    candidates.unshift(
      "isolation_specialization_set",
      "drop_set",
      "rest_pause",
      "myo_reps",
      "metabolic_stripping"
    );
  }

  if (
    strategy.goal === "massa muscolare" &&
    strategy.experienceLevel !== "intermedio" &&
    isIsolationSlot(slot)
  ) {
    candidates.push("drop_set", "rest_pause", "myo_reps");
  }

  if (
    strategy.goal === "ricomposizione" ||
    strategy.goal === "dimagrimento" ||
    strategy.goal === "salute/mantenimento"
  ) {
    return candidates.filter(
      (technique) =>
        !["drop_set", "rest_pause", "myo_reps", "metabolic_stripping", "cluster_set"].includes(
          technique
        )
    );
  }

  return [...new Set(candidates)];
}

export function getTechniqueRiskLevel(technique: AdvancedTechniqueKey) {
  return getTechniqueDefinition(technique)?.risk ?? "low";
}

export function canUseTechniqueForSlot(
  technique: AdvancedTechniqueKey,
  slot: ExerciseSlot,
  strategy: TrainingStrategy
) {
  if (isCardioOrMobilitySlot(slot)) {
    return false;
  }

  if (isTechniqueOptOut(strategy)) {
    return false;
  }

  if (isTechniqueExplicitlyExcluded(strategy, technique)) {
    return false;
  }

  const risk = getTechniqueRiskLevel(technique);
  const explicitlyAllowed = isTechniqueExplicitlyAllowed(strategy, technique);

  if (!explicitlyAllowed && risk !== "low") {
    return false;
  }

  if (strategy.experienceLevel === "principiante assoluto") {
    return technique === "controlled_tempo";
  }

  if (strategy.experienceLevel === "principiante con esperienza") {
    return [
      "controlled_tempo",
      "pause_in_stretch_or_peak",
      "double_progression",
    ].includes(technique);
  }

  if (
    strategy.goal === "forza" &&
    ["drop_set", "rest_pause", "myo_reps", "light_myo_reps", "metabolic_stripping"].includes(
      technique
    )
  ) {
    return false;
  }

  if (
    (strategy.goal === "dimagrimento" ||
      strategy.goal === "ricomposizione" ||
      strategy.goal === "salute/mantenimento" ||
      isLowRecoveryStrategy(strategy)) &&
    risk === "high"
  ) {
    return false;
  }

  if (
    hasMeaningfulLimitations(strategy) &&
    ["drop_set", "rest_pause", "myo_reps", "cluster_set", "metabolic_stripping"].includes(
      technique
    )
  ) {
    return false;
  }

  if (slotHasCautionMarkers(slot) && risk !== "low") {
    return false;
  }

  if (isMainCompoundSlot(slot)) {
    return [
      "controlled_tempo",
      "double_progression",
      "top_set_backoff",
      "back_off_set",
      "controlled_ramping",
    ].includes(technique);
  }

  if (isSecondaryCompoundSlot(slot)) {
    return [
      "controlled_tempo",
      "double_progression",
      "top_set_backoff",
      "back_off_set",
      "controlled_ramping",
    ].includes(technique);
  }

  if (isCoreSlot(slot)) {
    return ["controlled_tempo", "pause_in_stretch_or_peak", "double_progression"].includes(
      technique
    );
  }

  if (isAccessorySlot(slot)) {
    return !["cluster_set"].includes(technique);
  }

  if (isIsolationSlot(slot)) {
    return true;
  }

  return false;
}

export function buildTechniqueNote(
  technique: AdvancedTechniqueKey,
  slot: ExerciseSlot
) {
  switch (technique) {
    case "controlled_tempo":
      return "Tecnica: tempo controllato 3-1-1. Mantieni controllo e lascia almeno 2 ripetizioni in riserva.";
    case "pause_in_stretch_or_peak":
      return "Tecnica: pausa breve nel punto di massimo allungamento o contrazione. Fermati 1 secondo senza perdere assetto.";
    case "top_set_backoff":
      return "Tecnica: top set + back-off. Prima serie piu impegnativa, poi riduci leggermente il carico per le serie successive.";
    case "double_progression":
      return "Tecnica: doppia progressione. Prima chiudi il range di ripetizioni con tecnica pulita, poi aumenta il carico.";
    case "light_superset":
      return "Tecnica: superserie leggera. Abbina questo esercizio a un complemento compatibile della seduta solo se il recupero resta buono.";
    case "controlled_rest_pause":
      return "Tecnica: rest-pause leggero solo sull'ultima serie. Fai una pausa molto breve e aggiungi poche ripetizioni pulite.";
    case "light_myo_reps":
      return "Tecnica: myo-reps leggera sull'ultima serie. Usa mini-blocchi brevi solo se il gesto resta stabile.";
    case "back_off_set":
      return "Tecnica: back-off set. Dopo la serie principale riduci leggermente il carico e completa una serie piu controllata.";
    case "controlled_ramping":
      return "Tecnica: ramping controllato. Aumenta il carico in modo graduale fino alla serie migliore senza bruciare energie troppo presto.";
    case "drop_set":
      return "Tecnica: drop set solo sull'ultima serie di isolamento. Riduci il carico una volta e continua solo finche la tecnica resta pulita.";
    case "cluster_set":
      return "Tecnica: cluster set controllato. Spezza una serie pesante in mini-blocchi con pause brevi per mantenere qualita e velocita.";
    case "myo_reps":
      return "Tecnica: myo-reps solo su isolamento sicuro. Dopo una serie attivante aggiungi mini-serie brevi senza perdere controllo.";
    case "rest_pause":
      return "Tecnica: rest-pause solo sull'ultima serie e solo se l'esecuzione resta solida. Evita di forzare oltre la tecnica.";
    case "antagonist_superset":
      return `Tecnica: superserie antagonista. Se la seduta lo consente, alterna ${slot.label.toLowerCase()} con un movimento opposto senza sacrificare la qualita.`;
    case "metabolic_stripping":
      return "Tecnica: serie metabolica solo a fine lavoro accessorio. Accumula stimolo locale senza usarla sugli esercizi principali.";
    case "isolation_specialization_set":
      return "Tecnica: set di specializzazione su isolamento. Aggiungi stimolo mirato al distretto focus, senza portare ogni serie al limite.";
  }
}

function getSlotPriorityScore(
  strategy: TrainingStrategy,
  workout: WorkoutBlueprintLike,
  slot: ExerciseSlot
) {
  if (isCardioOrMobilitySlot(slot)) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;

  switch (slot.role) {
    case "isolation":
      score += 60;
      break;
    case "accessory":
      score += 48;
      break;
    case "compound":
      score += 28;
      break;
    case "heavy_compound":
      score += 20;
      break;
    case "core":
      score += 12;
      break;
    default:
      break;
  }

  if (isFocusSlot(strategy, workout, slot)) {
    score += 18;
  }

  if (slot.priority === "isolation" || slot.priority === "accessory") {
    score += 10;
  }

  if (slotHasCautionMarkers(slot)) {
    score -= 24;
  }

  if (strategy.goal === "massa muscolare" && (isIsolationSlot(slot) || isAccessorySlot(slot))) {
    score += 10;
  }

  if (strategy.goal === "massa muscolare" && strategy.experienceLevel === "intermedio") {
    if (isMainCompoundSlot(slot)) {
      score += 56;
    } else if (isSecondaryCompoundSlot(slot)) {
      score += 28;
    } else if (isIsolationSlot(slot) || isAccessorySlot(slot)) {
      score -= 12;
    }
  }

  if (strategy.goal === "forza" && isMainCompoundSlot(slot)) {
    score += 82;
  }

  if (strategy.goal === "forza" && isSecondaryCompoundSlot(slot)) {
    score += 36;
  }

  if (strategy.goal === "forza" && (isIsolationSlot(slot) || isAccessorySlot(slot))) {
    score -= 12;
  }

  return score;
}

export function getAdvancedTechniqueAssignments(
  strategy: TrainingStrategy,
  workoutBlueprints: WorkoutBlueprintLike[]
) {
  if (isTechniqueOptOut(strategy)) {
    return [] as AdvancedTechniqueAssignment[];
  }

  const caps = getWeeklyTechniqueCaps(strategy);
  if (caps.total <= 0) {
    return [] as AdvancedTechniqueAssignment[];
  }

  const assignments: AdvancedTechniqueAssignment[] = [];
  const workoutCounts = new Map<number, number>();
  const techniqueUsage = new Map<AdvancedTechniqueKey, number>();
  let moderateOrHighCount = 0;
  let highCount = 0;

  const rankedCandidates = workoutBlueprints
    .flatMap((workout, workoutIndex) =>
      workout.slots.map((slot) => ({
        workout,
        workoutIndex,
        slot,
        score: getSlotPriorityScore(strategy, workout, slot),
      }))
    )
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score);

  for (const candidate of rankedCandidates) {
    if (assignments.length >= caps.total) {
      break;
    }

    if ((workoutCounts.get(candidate.workoutIndex) ?? 0) >= caps.perWorkout) {
      continue;
    }

    const techniques = getTechniqueCandidatesForSlot(
      strategy,
      candidate.workout,
      candidate.slot
    );

    for (const technique of techniques) {
      if (!canUseTechniqueForSlot(technique, candidate.slot, strategy)) {
        continue;
      }

      const risk = getTechniqueRiskLevel(technique);
      const currentTechniqueUsage = techniqueUsage.get(technique) ?? 0;

      if (currentTechniqueUsage >= (risk === "low" ? 2 : 1)) {
        continue;
      }

      if (risk !== "low" && moderateOrHighCount >= caps.moderateOrHigh) {
        continue;
      }

      if (risk === "high" && highCount >= caps.high) {
        continue;
      }

      const note = buildTechniqueNote(technique, candidate.slot);
      assignments.push({
        workoutIndex: candidate.workoutIndex,
        workoutTitle: candidate.workout.title,
        slotId: candidate.slot.slotId,
        technique,
        note,
        risk,
      });
      workoutCounts.set(
        candidate.workoutIndex,
        (workoutCounts.get(candidate.workoutIndex) ?? 0) + 1
      );
      techniqueUsage.set(technique, currentTechniqueUsage + 1);

      if (risk !== "low") {
        moderateOrHighCount += 1;
      }

      if (risk === "high") {
        highCount += 1;
      }

      break;
    }
  }

  return assignments;
}
