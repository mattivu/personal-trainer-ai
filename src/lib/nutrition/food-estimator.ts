import "server-only";
import { QUANTITY_UNIT_VALUES } from "./meals";

export const FOOD_ESTIMATE_DESCRIPTION_MAX_LENGTH = 500;
export const FOOD_ESTIMATE_IMPRECISE_UNITS = [
  "porzione",
  "pezzo",
  "altro",
] as const;

export const FOOD_ESTIMATE_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
] as const;

export type FoodEstimateConfidence =
  (typeof FOOD_ESTIMATE_CONFIDENCE_VALUES)[number];

export type FoodEstimate = {
  name: string;
  quantityValue: number | null;
  quantityUnit: string | null;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionDescription: string;
  confidence: FoodEstimateConfidence;
  assumptions: string[];
};

const MEDICAL_NUTRITION_PATTERNS = [
  /\bdiabet\w*/i,
  /\banoress\w*/i,
  /\bbulimi\w*/i,
  /\bdisturb\w*\s+aliment\w*/i,
  /\bpatologi\w*/i,
  /\bmalatti\w*/i,
  /\bclinic\w*/i,
  /\bterapi\w*/i,
];

export const FOOD_ESTIMATE_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  name: "nutrition_food_estimate",
  strict: true,
  description: "Stima prudente di calorie e macronutrienti di un pasto.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "name",
      "quantityValue",
      "quantityUnit",
      "brand",
      "calories",
      "protein",
      "carbs",
      "fat",
      "portionDescription",
      "confidence",
      "assumptions",
    ],
    properties: {
      name: {
        type: "string",
      },
      quantityValue: {
        type: ["number", "null"],
        minimum: 0,
      },
      quantityUnit: {
        type: ["string", "null"],
      },
      brand: {
        type: ["string", "null"],
      },
      calories: {
        type: "number",
        minimum: 0,
      },
      protein: {
        type: "number",
        minimum: 0,
      },
      carbs: {
        type: "number",
        minimum: 0,
      },
      fat: {
        type: "number",
        minimum: 0,
      },
      portionDescription: {
        type: "string",
      },
      confidence: {
        type: "string",
        enum: FOOD_ESTIMATE_CONFIDENCE_VALUES,
      },
      assumptions: {
        type: "array",
        items: {
          type: "string",
        },
        maxItems: 6,
      },
    },
  },
};

export const FOOD_ESTIMATOR_SYSTEM_PROMPT = `
Sei un assistente nutrizionale prudente per Personal Trainer AI.
Parli in italiano.
La funzione e' solo indicativa, non medica e non sostituisce professionisti sanitari.
Non fare diagnosi.
Non fornire consigli medici.
Non parlare di dieta clinica o terapeutica.
Se il testo contiene richieste mediche o patologiche, rifiuta quella parte nelle assumptions e suggerisci di consultare un professionista qualificato.
Stima solo calorie, proteine, carboidrati e grassi di alimenti o pasti descritti.
Usa solo output JSON valido conforme allo schema richiesto.
Non aggiungere testo fuori dal JSON.
Usa stime realistiche e prudenti.
Se mancano grammi, porzioni o dettagli affidabili, non inventare precisione.
Se la quantita' e' vaga, usa confidence "low" o "medium".
Se descrizione, quantita' o marca sono assenti o vaghe, dichiaralo nelle assumptions.
Le assumptions devono esplicitare gli elementi assunti, le incertezze e gli ingredienti presumibili.
I valori numerici devono essere numeri, non stringhe.
Evita decimali inutilmente precisi: usa numeri ragionevoli e facili da correggere.
`.trim();

export function isMedicalNutritionRequest(description: string) {
  return MEDICAL_NUTRITION_PATTERNS.some((pattern) => pattern.test(description));
}

export function buildFoodEstimatorPrompt(input: {
  description: string;
  mealType?: string;
  quantityValue?: number | null;
  quantityUnit?: string | null;
  brand?: string | null;
  notes?: string | null;
}) {
  const medicalContextDetected = isMedicalNutritionRequest(input.description);
  const quantityLine =
    typeof input.quantityValue === "number" && Number.isFinite(input.quantityValue)
      ? `Quantita dichiarata: ${input.quantityValue}${input.quantityUnit ? ` ${input.quantityUnit}` : ""}.`
      : "Quantita non specificata o vaga.";
  const brandLine = input.brand ? `Marca dichiarata: ${input.brand}.` : "Marca non specificata.";
  const notesLine = input.notes ? `Note dichiarate: ${input.notes}.` : "Note non specificate.";

  return [
    "Restituisci solo JSON valido conforme allo schema.",
    "Stima il pasto in modo prudente.",
    medicalContextDetected
      ? "Il testo contiene riferimenti medici o patologici: non affrontare la parte medica e segnala il limite nelle assumptions."
      : "Non sono stati rilevati riferimenti medici evidenti.",
    input.mealType ? `Tipo pasto dichiarato: ${input.mealType}` : "Tipo pasto non specificato.",
    quantityLine,
    brandLine,
    notesLine,
    "Se quantita o unita non sono affidabili, mantieni confidence low o medium e spiegalo nelle assumptions.",
    `Descrizione utente: ${input.description}`,
  ].join("\n\n");
}

export function buildFoodEstimateDescription(input: {
  name?: string | null;
  quantityValue?: number | null;
  quantityUnit?: string | null;
  brand?: string | null;
  notes?: string | null;
}) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const brand = typeof input.brand === "string" ? input.brand.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const quantityUnit = typeof input.quantityUnit === "string" ? input.quantityUnit.trim() : "";
  const quantityValue =
    typeof input.quantityValue === "number" && Number.isFinite(input.quantityValue)
      ? input.quantityValue
      : null;

  const parts: string[] = [];

  if (quantityValue !== null && quantityUnit && name) {
    parts.push(`${quantityValue} ${quantityUnit} di ${name}`);
  } else if (quantityValue !== null && name) {
    parts.push(`${quantityValue} di ${name}`);
  } else if (name) {
    parts.push(name);
  }

  if (brand) {
    parts.push(`marca ${brand}`);
  }

  if (notes) {
    parts.push(`note: ${notes}`);
  }

  const description = parts.join(", ").replace(/\s+/g, " ").trim();
  return description.slice(0, FOOD_ESTIMATE_DESCRIPTION_MAX_LENGTH);
}

export function clampFoodEstimateConfidence(input: {
  confidence: FoodEstimateConfidence;
  quantityValue?: number | null;
  quantityUnit?: string | null;
}) {
  const { confidence, quantityValue, quantityUnit } = input;

  if (
    typeof quantityValue === "number" &&
    Number.isFinite(quantityValue) &&
    quantityValue > 0 &&
    quantityUnit &&
    FOOD_ESTIMATE_IMPRECISE_UNITS.includes(
      quantityUnit as (typeof FOOD_ESTIMATE_IMPRECISE_UNITS)[number]
    ) &&
    confidence === "high"
  ) {
    return "medium" satisfies FoodEstimateConfidence;
  }

  return confidence;
}

function sanitizeString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function sanitizeNonNegativeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  const normalized = Math.round(value * 10) / 10;
  return normalized >= 0 ? normalized : 0;
}

function sanitizeNullableNonNegativeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.round(value * 10) / 10;
  return normalized >= 0 ? normalized : null;
}

function sanitizeQuantityUnit(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (QUANTITY_UNIT_VALUES.includes(normalized as (typeof QUANTITY_UNIT_VALUES)[number])) {
    return normalized;
  }

  if (["grammi", "grammo", "gr"].includes(normalized)) {
    return "g";
  }

  if (["millilitri", "millilitro"].includes(normalized)) {
    return "ml";
  }

  if (["porzioni"].includes(normalized)) {
    return "porzione";
  }

  if (["pezzi"].includes(normalized)) {
    return "pezzo";
  }

  return "altro";
}

function sanitizeAssumptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function parseFoodEstimate(value: unknown): FoodEstimate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Risposta AI non valida.");
  }

  const payload = value as Record<string, unknown>;
  const parsedConfidence = FOOD_ESTIMATE_CONFIDENCE_VALUES.includes(
    payload.confidence as FoodEstimateConfidence
  )
    ? (payload.confidence as FoodEstimateConfidence)
    : "low";
  const quantityValue = sanitizeNullableNonNegativeNumber(payload.quantityValue);
  const quantityUnit = sanitizeQuantityUnit(payload.quantityUnit);
  const confidence = clampFoodEstimateConfidence({
    confidence: parsedConfidence,
    quantityValue,
    quantityUnit,
  });

  return {
    name: sanitizeString(payload.name, "Pasto stimato"),
    quantityValue,
    quantityUnit,
    brand:
      typeof payload.brand === "string" && payload.brand.trim()
        ? payload.brand.trim()
        : null,
    calories: sanitizeNonNegativeNumber(payload.calories),
    protein: sanitizeNonNegativeNumber(payload.protein),
    carbs: sanitizeNonNegativeNumber(payload.carbs),
    fat: sanitizeNonNegativeNumber(payload.fat),
    portionDescription: sanitizeString(
      payload.portionDescription,
      "Porzione non specificata"
    ),
    confidence,
    assumptions: sanitizeAssumptions(payload.assumptions),
  };
}
