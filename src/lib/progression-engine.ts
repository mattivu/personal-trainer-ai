export type ProgressionSuggestionStatus =
  | "increase_load"
  | "repeat_load"
  | "reduce_load"
  | "increase_reps"
  | "no_previous_data"
  | "time_based"
  | "incomplete_data";

export type ProgressionSuggestionConfidence = "low" | "medium" | "high";

export type ProgressionSuggestion = {
  status: ProgressionSuggestionStatus;
  title: string;
  message: string;
  suggestedAction: string;
  confidence: ProgressionSuggestionConfidence;
};

export type PlannedExerciseForProgression = {
  sets: number | null;
  reps: string | null;
  intensity: string | null;
  restSeconds: number | null;
};

export type PreviousExerciseSetPerformance = {
  setNumber: number;
  weightKg: number | null;
  actualReps: number | null;
  rir: number | null;
  completed: boolean;
};

export type ParsedRepTarget =
  | {
      kind: "reps";
      min: number;
      max: number;
      original: string;
    }
  | {
      kind: "time";
      min: number;
      max: number;
      unit: "sec" | "min";
      original: string;
    }
  | {
      kind: "unknown";
      original: string | null;
    };

export type SetPerformanceSummary = {
  analyzedSets: number;
  completedSets: number;
  allCompleted: boolean;
  repsInRangeSets: number;
  repsAtOrAboveHighSets: number;
  repsBelowLowSets: number;
  rirValuesCount: number;
  averageRir: number | null;
  lowRirSets: number;
  veryHighRirSets: number;
  totalReps: number | null;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatAverageRir(value: number | null) {
  if (value === null) {
    return null;
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function parseRirRange(intensity: string | null | undefined) {
  if (!intensity) {
    return null;
  }

  const normalized = normalizeText(intensity);
  const rangeMatch = normalized.match(/rir\s*(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/i);

  if (rangeMatch) {
    const min = Number(rangeMatch[1].replace(",", "."));
    const max = Number(rangeMatch[2].replace(",", "."));

    if (Number.isFinite(min) && Number.isFinite(max)) {
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
      };
    }
  }

  const singleMatch = normalized.match(/rir\s*(\d+(?:[.,]\d+)?)/i);

  if (!singleMatch) {
    return null;
  }

  const value = Number(singleMatch[1].replace(",", "."));
  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    min: value,
    max: value,
  };
}

export function parseRepTarget(reps: string | null | undefined): ParsedRepTarget {
  if (!reps) {
    return {
      kind: "unknown",
      original: reps ?? null,
    };
  }

  const normalized = normalizeText(reps);
  const rangeMatch = normalized.match(/(\d+)\s*-\s*(\d+)/);
  const singleMatch = normalized.match(/\b(\d+)\b/);
  const isTimeBased =
    normalized.includes("sec") ||
    normalized.includes("second") ||
    normalized.includes("min") ||
    normalized.includes("minut");

  if (rangeMatch) {
    const firstValue = Number(rangeMatch[1]);
    const secondValue = Number(rangeMatch[2]);

    if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) {
      return {
        kind: "unknown",
        original: reps,
      };
    }

    const min = Math.min(firstValue, secondValue);
    const max = Math.max(firstValue, secondValue);

    if (isTimeBased) {
      return {
        kind: "time",
        min,
        max,
        unit:
          normalized.includes("min") || normalized.includes("minut") ? "min" : "sec",
        original: reps,
      };
    }

    return {
      kind: "reps",
      min,
      max,
      original: reps,
    };
  }

  if (singleMatch) {
    const value = Number(singleMatch[1]);

    if (!Number.isFinite(value)) {
      return {
        kind: "unknown",
        original: reps,
      };
    }

    if (isTimeBased) {
      return {
        kind: "time",
        min: value,
        max: value,
        unit:
          normalized.includes("min") || normalized.includes("minut") ? "min" : "sec",
        original: reps,
      };
    }

    return {
      kind: "reps",
      min: value,
      max: value,
      original: reps,
    };
  }

  return {
    kind: "unknown",
    original: reps,
  };
}

export function calculateSetPerformance(
  repTarget: ParsedRepTarget,
  previousSets: PreviousExerciseSetPerformance[],
  plannedSets: number | null
): SetPerformanceSummary {
  const sortedSets = [...previousSets].sort((left, right) => left.setNumber - right.setNumber);
  const setsToAnalyze =
    plannedSets && plannedSets > 0 ? sortedSets.slice(0, plannedSets) : sortedSets;
  const rirValues = setsToAnalyze
    .map((set) => set.rir)
    .filter((rir): rir is number => rir !== null);

  const totalRir = rirValues.reduce((sum, value) => sum + value, 0);
  const totalRepsValues = setsToAnalyze
    .map((set) => set.actualReps)
    .filter((reps): reps is number => reps !== null);

  const repsSummary =
    repTarget.kind === "reps"
      ? setsToAnalyze.reduce(
          (summary, set) => {
            if (set.actualReps === null) {
              return summary;
            }

            if (set.actualReps >= repTarget.min && set.actualReps <= repTarget.max) {
              summary.repsInRangeSets += 1;
            }

            if (set.actualReps >= repTarget.max) {
              summary.repsAtOrAboveHighSets += 1;
            }

            if (set.actualReps < repTarget.min) {
              summary.repsBelowLowSets += 1;
            }

            return summary;
          },
          {
            repsInRangeSets: 0,
            repsAtOrAboveHighSets: 0,
            repsBelowLowSets: 0,
          }
        )
      : {
          repsInRangeSets: 0,
          repsAtOrAboveHighSets: 0,
          repsBelowLowSets: 0,
        };

  return {
    analyzedSets: setsToAnalyze.length,
    completedSets: setsToAnalyze.filter((set) => set.completed).length,
    allCompleted: setsToAnalyze.length > 0 && setsToAnalyze.every((set) => set.completed),
    repsInRangeSets: repsSummary.repsInRangeSets,
    repsAtOrAboveHighSets: repsSummary.repsAtOrAboveHighSets,
    repsBelowLowSets: repsSummary.repsBelowLowSets,
    rirValuesCount: rirValues.length,
    averageRir: rirValues.length > 0 ? totalRir / rirValues.length : null,
    lowRirSets: rirValues.filter((rir) => rir <= 0).length,
    veryHighRirSets: rirValues.filter((rir) => rir >= 4).length,
    totalReps:
      totalRepsValues.length > 0
        ? totalRepsValues.reduce((sum, value) => sum + value, 0)
        : null,
  };
}

function buildSuggestion(
  status: ProgressionSuggestionStatus,
  message: string,
  suggestedAction: string,
  confidence: ProgressionSuggestionConfidence
): ProgressionSuggestion {
  return {
    status,
    title: "Consiglio per oggi",
    message,
    suggestedAction,
    confidence,
  };
}

export function generateExerciseProgressionSuggestion(input: {
  plannedExercise: PlannedExerciseForProgression;
  previousSets: PreviousExerciseSetPerformance[];
}): ProgressionSuggestion {
  const { plannedExercise, previousSets } = input;
  const repTarget = parseRepTarget(plannedExercise.reps);

  if (previousSets.length === 0) {
    return buildSuggestion(
      "no_previous_data",
      "Prima volta con questo esercizio. Scegli un carico gestibile e resta lontano dal cedimento.",
      "Parti prudente, cura la tecnica pulita e usa la seduta per trovare un riferimento solido.",
      "low"
    );
  }

  if (repTarget.kind === "unknown") {
    return buildSuggestion(
      "incomplete_data",
      "Non riesco a leggere con sicurezza il target di oggi. Usa la performance precedente come riferimento prudente.",
      "Mantieni il carico solo se la tecnica resta pulita e regola a sensazione senza inseguire aumenti aggressivi.",
      "low"
    );
  }

  if (repTarget.kind === "time") {
    return buildSuggestion(
      "time_based",
      "Prova ad aumentare leggermente la durata mantenendo controllo e tecnica.",
      `Resta tra ${formatNumber(repTarget.min)} e ${formatNumber(repTarget.max)} ${repTarget.unit} e aggiungi poco alla volta solo se il movimento resta stabile.`,
      "medium"
    );
  }

  const summary = calculateSetPerformance(repTarget, previousSets, plannedExercise.sets);

  if (
    summary.analyzedSets === 0 ||
    previousSets.every(
      (set) => set.actualReps === null && set.rir === null && !set.completed && set.weightKg === null
    )
  ) {
    return buildSuggestion(
      "incomplete_data",
      "I dati della volta precedente sono troppo incompleti per dare un'indicazione affidabile.",
      "Mantieni il carico solo se ti senti stabile e punta a registrare meglio reps e RIR oggi.",
      "low"
    );
  }

  const averageRir = formatAverageRir(summary.averageRir);
  const lowRirThreshold =
    summary.rirValuesCount > 0 &&
    summary.lowRirSets >= Math.max(1, Math.ceil(summary.rirValuesCount / 2));
  const highRirThreshold =
    summary.rirValuesCount > 0 &&
    summary.veryHighRirSets >= Math.max(1, Math.ceil(summary.rirValuesCount / 2));
  const allAtOrAboveHigh =
    summary.analyzedSets > 0 && summary.repsAtOrAboveHighSets === summary.analyzedSets;
  const targetRirRange = parseRirRange(plannedExercise.intensity);
  const belowTargetRir =
    targetRirRange !== null &&
    summary.averageRir !== null &&
    summary.averageRir < targetRirRange.min;

  if (lowRirThreshold || belowTargetRir) {
    const rirDetail = averageRir ? ` con RIR medio ${averageRir}` : "";

    return buildSuggestion(
      summary.repsBelowLowSets >= Math.ceil(summary.analyzedSets / 2)
        ? "reduce_load"
        : "repeat_load",
      `La seduta precedente era molto vicina al cedimento${rirDetail}. Prima di aumentare, prova a completare il target con più controllo.`,
      "Mantieni il carico oppure riducilo leggermente se la tecnica peggiora.",
      "high"
    );
  }

  if (summary.repsBelowLowSets > 0 || !summary.allCompleted) {
    const completedDetail = `${summary.completedSets}/${summary.analyzedSets} serie completate`;
    const useReduceLoad =
      summary.repsBelowLowSets >= Math.ceil(summary.analyzedSets / 2) &&
      summary.averageRir !== null &&
      summary.averageRir <= 1;

    return buildSuggestion(
      useReduceLoad ? "reduce_load" : "repeat_load",
      `Non hai completato il target: ${completedDetail}. Mantieni il carico oppure riducilo leggermente se la tecnica peggiora.`,
      "Punta prima a chiudere tutte le serie nel range previsto con tecnica pulita.",
      useReduceLoad ? "medium" : "high"
    );
  }

  if (allAtOrAboveHigh && (summary.averageRir === null || summary.averageRir >= 1)) {
    const rirDetail = averageRir ? ` con RIR medio ${averageRir}` : "";

    return buildSuggestion(
      "increase_load",
      `Hai completato ${summary.completedSets}/${summary.analyzedSets} serie nel range alto${rirDetail}. Oggi puoi aumentare leggermente il carico.`,
      "Aumenta leggermente il carico solo se la tecnica resta pulita.",
      summary.averageRir === null ? "medium" : "high"
    );
  }

  if (highRirThreshold && summary.repsInRangeSets === summary.analyzedSets) {
    const rirDetail = averageRir ? ` con RIR medio ${averageRir}` : "";

    return buildSuggestion(
      "increase_load",
      `Il carico sembra gestibile${rirDetail}. Puoi provare ad aumentare leggermente o puntare al range alto.`,
      "Scegli tra un piccolo aumento del carico o qualche ripetizione in piu, mantenendo tecnica pulita.",
      "medium"
    );
  }

  if (summary.allCompleted) {
    const previousTotalReps = summary.totalReps;
    const repsDetail =
      previousTotalReps !== null
        ? ` Hai fatto ${previousTotalReps} ripetizioni totali nella seduta precedente.`
        : "";

    return buildSuggestion(
      "increase_reps",
      `Hai completato tutte le serie ma non tutto il range alto.${repsDetail} Mantieni il carico e prova ad aggiungere 1-2 ripetizioni totali rispetto alla volta precedente.`,
      "Mantieni il carico e cerca un piccolo progresso sulle ripetizioni, senza perdere controllo.",
      "high"
    );
  }

  return buildSuggestion(
    "repeat_load",
    "Mantieni il carico e ripeti la seduta cercando piu controllo prima di aumentare.",
    "Concentrati su tecnica pulita, range previsto e un RIR coerente con l'obiettivo.",
    "medium"
  );
}
