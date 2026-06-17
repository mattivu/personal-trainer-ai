import { NextResponse } from "next/server";
import { APIError } from "openai";
import {
  AIConfigurationError,
  getOpenAIClient,
  getOpenAIModel,
} from "@/lib/ai/openai-client";
import {
  FOOD_ESTIMATOR_SYSTEM_PROMPT,
  buildFoodEstimatorPrompt,
  FOOD_ESTIMATE_DESCRIPTION_MAX_LENGTH,
  FOOD_ESTIMATE_RESPONSE_FORMAT,
  parseFoodEstimate,
} from "@/lib/nutrition/food-estimator";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type RawBody = {
  description?: unknown;
  mealType?: unknown;
};

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

function parseRequiredDescription(value: unknown) {
  if (typeof value !== "string") {
    return {
      ok: false as const,
      message: "description deve essere una stringa.",
    };
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return {
      ok: false as const,
      message: "La descrizione del pasto e' obbligatoria.",
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
          { ok: false, message: "Payload JSON non valido." },
          { status: 400 }
        );
      }

      throw error;
    }

    const description = parseRequiredDescription(body.description);

    if (!description.ok) {
      return NextResponse.json(
        { ok: false, message: description.message },
        { status: 400 }
      );
    }

    const mealType = parseOptionalMealType(body.mealType);

    if (!mealType.ok) {
      return NextResponse.json(
        { ok: false, message: mealType.message },
        { status: 400 }
      );
    }

    const response = await getOpenAIClient().responses.create({
      model: getOpenAIModel(),
      instructions: FOOD_ESTIMATOR_SYSTEM_PROMPT,
      input: buildFoodEstimatorPrompt({
        description: description.value,
        mealType: mealType.value,
      }),
      text: {
        verbosity: "low",
        format: FOOD_ESTIMATE_RESPONSE_FORMAT,
      },
    });

    const rawOutput = response.output_text?.trim();

    if (!rawOutput) {
      throw new Error("Risposta AI vuota.");
    }

    return NextResponse.json({
      ok: true,
      estimate: parseFoodEstimate(JSON.parse(rawOutput)),
    });
  } catch (error) {
    if (error instanceof AIConfigurationError) {
      return NextResponse.json(
        { ok: false, message: "Stima AI non configurata." },
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
        { ok: false, message: "Stima AI temporaneamente non disponibile." },
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
