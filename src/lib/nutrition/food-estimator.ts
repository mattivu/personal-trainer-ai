import "server-only";

export const FOOD_ESTIMATE_DESCRIPTION_MAX_LENGTH = 500;

export const FOOD_ESTIMATE_CONFIDENCE_VALUES = [
  "low",
  "medium",
  "high",
] as const;

export type FoodEstimateConfidence =
  (typeof FOOD_ESTIMATE_CONFIDENCE_VALUES)[number];

export type FoodEstimate = {
  name: string;
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
}) {
  const medicalContextDetected = isMedicalNutritionRequest(input.description);

  return [
    "Restituisci solo JSON valido conforme allo schema.",
    "Stima il pasto in modo prudente.",
    medicalContextDetected
      ? "Il testo contiene riferimenti medici o patologici: non affrontare la parte medica e segnala il limite nelle assumptions."
      : "Non sono stati rilevati riferimenti medici evidenti.",
    input.mealType ? `Tipo pasto dichiarato: ${input.mealType}` : "Tipo pasto non specificato.",
    `Descrizione utente: ${input.description}`,
  ].join("\n\n");
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

  const normalized = Math.round(value);
  return normalized >= 0 ? normalized : 0;
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
  const confidence = FOOD_ESTIMATE_CONFIDENCE_VALUES.includes(
    payload.confidence as FoodEstimateConfidence
  )
    ? (payload.confidence as FoodEstimateConfidence)
    : "low";

  return {
    name: sanitizeString(payload.name, "Pasto stimato"),
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
