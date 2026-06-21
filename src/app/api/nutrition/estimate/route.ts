import { NextResponse } from "next/server";
import { APIError } from "openai";
import {
  AIConfigurationError,
  getOpenAIClient,
  getOpenAIModel,
} from "@/lib/ai/openai-client";
import {
  FOOD_ESTIMATOR_SYSTEM_PROMPT,
  buildFoodEstimateDescription,
  buildFoodEstimatorPrompt,
  FOOD_ESTIMATE_DESCRIPTION_MAX_LENGTH,
  FOOD_ESTIMATE_RESPONSE_FORMAT,
  parseFoodEstimate,
} from "@/lib/nutrition/food-estimator";
import { QUANTITY_UNIT_VALUES } from "@/lib/nutrition/meals";
import {
  MEAL_BRAND_MAX_LENGTH,
  MEAL_NOTES_MAX_LENGTH,
} from "@/lib/nutrition/validation";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type RawBody = {
  description?: unknown;
  name?: unknown;
  mealType?: unknown;
  quantityValue?: unknown;
  quantityUnit?: unknown;
  brand?: unknown;
  notes?: unknown;
};

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

function parseOptionalDescription(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false as const,
      message: "description deve essere una stringa.",
    };
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  if (normalized.length > FOOD_ESTIMATE_DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false as const,
      message: `description puo' contenere al massimo ${FOOD_ESTIMATE_DESCRIPTION_MAX_LENGTH} caratteri.`,
    };
  }

  return {
    ok: true as const,
    value: normalized,
  };
}

function parseOptionalMealType(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false as const,
      message: "mealType deve essere una stringa.",
    };
  }

  const normalized = value.trim();

  if (!normalized) {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  return {
    ok: true as const,
    value: normalized,
  };
}

function parseOptionalQuantityValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  const normalized =
    typeof value === "string" ? value.trim().replace(",", ".") : value;
  const parsed = typeof normalized === "number" ? normalized : Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return {
      ok: false as const,
      message: "quantityValue deve essere un numero maggiore di 0.",
    };
  }

  return {
    ok: true as const,
    value: parsed,
  };
}

function parseOptionalShortString(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false as const,
      message: `${field} deve essere una stringa.`,
    };
  }

  const normalized = value.trim();

  if (!normalized) {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  if (normalized.length > maxLength) {
    return {
      ok: false as const,
      message: `${field} puo' contenere al massimo ${maxLength} caratteri.`,
    };
  }

  return {
    ok: true as const,
    value: normalized,
  };
}

function parseOptionalQuantityUnit(value: unknown) {
  const parsed = parseOptionalShortString(value, "quantityUnit", 20);

  if (!parsed.ok || !parsed.value) {
    return parsed;
  }

  if (!QUANTITY_UNIT_VALUES.includes(parsed.value as (typeof QUANTITY_UNIT_VALUES)[number])) {
    return {
      ok: false as const,
      message: `quantityUnit deve essere uno tra: ${QUANTITY_UNIT_VALUES.join(", ")}.`,
    };
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    let body: RawBody;

    try {
      body = (await request.json()) as RawBody;
    } catch (error) {
      if (isJsonSyntaxError(error)) {
        return NextResponse.json(
          { ok: false, message: "Dati non validi. Controlla i campi e riprova." },
          { status: 400 }
        );
      }

      throw error;
    }

    const description = parseOptionalDescription(body.description);
    const name = parseOptionalShortString(body.name, "name", 120);
    const mealType = parseOptionalMealType(body.mealType);
    const quantityValue = parseOptionalQuantityValue(body.quantityValue);
    const quantityUnit = parseOptionalQuantityUnit(body.quantityUnit);
    const brand = parseOptionalShortString(body.brand, "brand", MEAL_BRAND_MAX_LENGTH);
    const notes = parseOptionalShortString(body.notes, "notes", MEAL_NOTES_MAX_LENGTH);

    if (!description.ok) {
      return NextResponse.json(
        { ok: false, message: description.message },
        { status: 400 }
      );
    }

    if (!name.ok) {
      return NextResponse.json(
        { ok: false, message: name.message },
        { status: 400 }
      );
    }

    if (!mealType.ok) {
      return NextResponse.json(
        { ok: false, message: mealType.message },
        { status: 400 }
      );
    }

    if (!quantityValue.ok) {
      return NextResponse.json(
        { ok: false, message: quantityValue.message },
        { status: 400 }
      );
    }

    if (!quantityUnit.ok) {
      return NextResponse.json(
        { ok: false, message: quantityUnit.message },
        { status: 400 }
      );
    }

    if (!brand.ok) {
      return NextResponse.json(
        { ok: false, message: brand.message },
        { status: 400 }
      );
    }

    if (!notes.ok) {
      return NextResponse.json(
        { ok: false, message: notes.message },
        { status: 400 }
      );
    }

    const resolvedDescription =
      description.value ??
      buildFoodEstimateDescription({
        name: name.value,
        quantityValue: quantityValue.value,
        quantityUnit: quantityUnit.value,
        brand: brand.value,
        notes: notes.value,
      });

    if (!resolvedDescription) {
      return NextResponse.json(
        {
          ok: false,
          message: "Inserisci alimento, quantità e unità prima di calcolare i valori.",
        },
        { status: 400 }
      );
    }

    const response = await getOpenAIClient().responses.create({
      model: getOpenAIModel(),
      instructions: FOOD_ESTIMATOR_SYSTEM_PROMPT,
      input: buildFoodEstimatorPrompt({
        description: resolvedDescription,
        mealType: mealType.value,
        quantityValue: quantityValue.value,
        quantityUnit: quantityUnit.value,
        brand: brand.value,
        notes: notes.value,
      }),
      text: {
        verbosity: "low",
        format: FOOD_ESTIMATE_RESPONSE_FORMAT,
      },
    });

    const rawOutput = response.output_text?.trim();

    if (!rawOutput) {
      throw new Error("Risposta della stima vuota.");
    }

    return NextResponse.json({
      ok: true,
      estimate: parseFoodEstimate(JSON.parse(rawOutput)),
    });
  } catch (error) {
    if (error instanceof AIConfigurationError) {
      return NextResponse.json(
        { ok: false, message: "Stima automatica non disponibile in questo momento." },
        { status: 503 }
      );
    }

    if (error instanceof APIError) {
      console.error("Nutrition estimate OpenAI error", {
        status: error.status,
        name: error.name,
        message: error.message,
      });

      return NextResponse.json(
        { ok: false, message: "Stima automatica temporaneamente non disponibile." },
        { status: 502 }
      );
    }

    console.error("Nutrition estimate route error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile stimare il pasto in questo momento." },
      { status: 500 }
    );
  }
}
