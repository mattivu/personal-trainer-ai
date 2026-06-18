import type { BodyWeightEntry } from "@prisma/client";
import { isValidDateKey } from "@/lib/nutrition/date";

export const BODY_WEIGHT_NOTES_MAX_LENGTH = 500;
export const BODY_WEIGHT_MIN_KG = 20;
export const BODY_WEIGHT_MAX_KG = 300;
const STABLE_THRESHOLD_7_DAYS = 0.4;
const STABLE_THRESHOLD_30_DAYS = 1;

export type BodyWeightTrend =
  | "in_calo"
  | "stabile"
  | "in_aumento"
  | "dati_insufficienti";

export type BodyWeightSummary = {
  latestWeightKg: number | null;
  initialWeightKg: number | null;
  totalChangeKg: number | null;
  change7DaysKg: number | null;
  change30DaysKg: number | null;
  trend: BodyWeightTrend;
};

export type BodyWeightInput = {
  date: string;
  weightKg: number;
  notes: string | null;
};

export function getBodyWeightEntryDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`);
}

export function getBodyWeightDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isFutureBodyWeightDate(dateKey: string) {
  return getBodyWeightDateKey(getBodyWeightEntryDate(dateKey)) > getBodyWeightDateKey(new Date());
}

export function formatBodyWeightDelta(value: number | null) {
  if (value === null) {
    return "Dati insufficienti";
  }

  const formattedValue = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value));

  if (value === 0) {
    return `${formattedValue} kg`;
  }

  return `${value > 0 ? "+" : "-"}${formattedValue} kg`;
}

export function getBodyWeightTrendLabel(trend: BodyWeightTrend) {
  switch (trend) {
    case "in_calo":
      return "In calo";
    case "stabile":
      return "Stabile";
    case "in_aumento":
      return "In aumento";
    case "dati_insufficienti":
    default:
      return "Dati insufficienti";
  }
}

function getEntryForCutoff(entries: BodyWeightEntry[], cutoffDate: Date) {
  let selected: BodyWeightEntry | null = null;

  for (const entry of entries) {
    if (entry.date <= cutoffDate) {
      selected = entry;
    } else {
      break;
    }
  }

  return selected;
}

function calculateWindowChange(entries: BodyWeightEntry[], days: number) {
  if (entries.length < 2) {
    return null;
  }

  const latestEntry = entries.at(-1);

  if (!latestEntry) {
    return null;
  }

  const cutoffDate = new Date(latestEntry.date);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);

  const baseEntry = getEntryForCutoff(entries, cutoffDate);

  if (!baseEntry || baseEntry.id === latestEntry.id) {
    return null;
  }

  return latestEntry.weightKg - baseEntry.weightKg;
}

export function calculateBodyWeightTrend(entries: BodyWeightEntry[]): BodyWeightTrend {
  if (entries.length < 2) {
    return "dati_insufficienti";
  }

  const change30Days = calculateWindowChange(entries, 30);

  if (change30Days !== null) {
    if (Math.abs(change30Days) < STABLE_THRESHOLD_30_DAYS) {
      return "stabile";
    }

    return change30Days < 0 ? "in_calo" : "in_aumento";
  }

  const change7Days = calculateWindowChange(entries, 7);

  if (change7Days !== null) {
    if (Math.abs(change7Days) < STABLE_THRESHOLD_7_DAYS) {
      return "stabile";
    }

    return change7Days < 0 ? "in_calo" : "in_aumento";
  }

  return "dati_insufficienti";
}

export function calculateBodyWeightSummary(entries: BodyWeightEntry[]): BodyWeightSummary {
  if (entries.length === 0) {
    return {
      latestWeightKg: null,
      initialWeightKg: null,
      totalChangeKg: null,
      change7DaysKg: null,
      change30DaysKg: null,
      trend: "dati_insufficienti",
    };
  }

  const latestEntry = entries.at(-1) ?? null;
  const initialEntry = entries[0] ?? null;

  return {
    latestWeightKg: latestEntry?.weightKg ?? null,
    initialWeightKg: initialEntry?.weightKg ?? null,
    totalChangeKg:
      latestEntry && initialEntry ? latestEntry.weightKg - initialEntry.weightKg : null,
    change7DaysKg: calculateWindowChange(entries, 7),
    change30DaysKg: calculateWindowChange(entries, 30),
    trend: calculateBodyWeightTrend(entries),
  };
}

export function validateBodyWeightInput(input: {
  date?: unknown;
  weightKg?: unknown;
  notes?: unknown;
}) {
  if (typeof input.date !== "string" || input.date.trim().length === 0) {
    return {
      ok: false as const,
      message: "La data e obbligatoria.",
    };
  }

  const date = input.date.trim();

  if (!isValidDateKey(date)) {
    return {
      ok: false as const,
      message: "La data deve usare il formato YYYY-MM-DD.",
    };
  }

  if (isFutureBodyWeightDate(date)) {
    return {
      ok: false as const,
      message: "Non puoi registrare una pesata in una data futura.",
    };
  }

  const numericWeight =
    typeof input.weightKg === "number"
      ? input.weightKg
      : typeof input.weightKg === "string"
        ? Number(input.weightKg)
        : Number.NaN;

  if (!Number.isFinite(numericWeight)) {
    return {
      ok: false as const,
      message: "Il peso deve essere un numero valido.",
    };
  }

  const roundedWeight = Math.round(numericWeight * 10) / 10;

  if (roundedWeight < BODY_WEIGHT_MIN_KG || roundedWeight > BODY_WEIGHT_MAX_KG) {
    return {
      ok: false as const,
      message: `Il peso deve essere compreso tra ${BODY_WEIGHT_MIN_KG} e ${BODY_WEIGHT_MAX_KG} kg.`,
    };
  }

  if (input.notes !== undefined && input.notes !== null && typeof input.notes !== "string") {
    return {
      ok: false as const,
      message: "Le note devono essere testo.",
    };
  }

  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (notes.length > BODY_WEIGHT_NOTES_MAX_LENGTH) {
    return {
      ok: false as const,
      message: `Le note non possono superare ${BODY_WEIGHT_NOTES_MAX_LENGTH} caratteri.`,
    };
  }

  return {
    ok: true as const,
    value: {
      date,
      weightKg: roundedWeight,
      notes: notes.length > 0 ? notes : null,
    } satisfies BodyWeightInput,
  };
}
