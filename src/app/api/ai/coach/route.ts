import { NextResponse } from "next/server";
import { APIError } from "openai";
import { buildCoachContext, CoachContextError } from "@/lib/ai/coach-context";
import {
  COACH_RESPONSE_FORMAT,
  COACH_SYSTEM_PROMPT,
  buildCoachUserPrompt,
  parseCoachResult,
  type CoachMode,
} from "@/lib/ai/coach-prompts";
import {
  AIConfigurationError,
  getOpenAIClient,
  getOpenAIModel,
} from "@/lib/ai/openai-client";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type RawBody = {
  mode?: unknown;
  workoutId?: unknown;
  workoutLogId?: unknown;
};

const VALID_MODES: CoachMode[] = [
  "program_overview",
  "workout_guidance",
  "post_workout_review",
];

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

function parseOptionalId(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
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

    if (user.onboardingStatus !== "completed") {
      return NextResponse.json(
        { ok: false, message: "Onboarding incompleto." },
        { status: 403 }
      );
    }

    let body: RawBody;

    try {
      body = (await request.json()) as RawBody;
    } catch (error) {
      if (isJsonSyntaxError(error)) {
        return NextResponse.json(
          { ok: false, message: "Richiesta non valida. Riprova." },
          { status: 400 }
        );
      }

      throw error;
    }

    if (!VALID_MODES.includes(body.mode as CoachMode)) {
      return NextResponse.json(
        { ok: false, message: "mode non valido." },
        { status: 400 }
      );
    }

    const mode = body.mode as CoachMode;
    const workoutId = parseOptionalId(body.workoutId);
    const workoutLogId = parseOptionalId(body.workoutLogId);

    if (workoutId === null) {
      return NextResponse.json(
        { ok: false, message: "workoutId non valido." },
        { status: 400 }
      );
    }

    if (workoutLogId === null) {
      return NextResponse.json(
        { ok: false, message: "workoutLogId non valido." },
        { status: 400 }
      );
    }

    if (mode === "workout_guidance" && workoutId === undefined) {
      return NextResponse.json(
        { ok: false, message: "workoutId obbligatorio per questa modalita." },
        { status: 400 }
      );
    }

    if (mode === "post_workout_review" && workoutLogId === undefined) {
      return NextResponse.json(
        { ok: false, message: "workoutLogId obbligatorio per questa modalita." },
        { status: 400 }
      );
    }

    const context = await buildCoachContext({
      userId: user.id,
      mode,
      workoutId,
      workoutLogId,
    });

    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      instructions: COACH_SYSTEM_PROMPT,
      input: buildCoachUserPrompt(mode, context),
      text: {
        verbosity: "low",
        format: COACH_RESPONSE_FORMAT,
      },
    });

    const rawOutput = response.output_text?.trim();

    if (!rawOutput) {
      throw new Error("Risposta del coach vuota.");
    }

    const result = parseCoachResult(JSON.parse(rawOutput));

    return NextResponse.json({
      ok: true,
      mode,
      result,
    });
  } catch (error) {
    if (error instanceof AIConfigurationError) {
      return NextResponse.json(
        { ok: false, message: "Coach non disponibile in questo momento." },
        { status: 503 }
      );
    }

    if (error instanceof CoachContextError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status }
      );
    }

    if (error instanceof APIError) {
      console.error("AI coach OpenAI error", {
        status: error.status,
        name: error.name,
        message: error.message,
      });

      return NextResponse.json(
        { ok: false, message: "Coach temporaneamente non disponibile." },
        { status: 502 }
      );
    }

    console.error("AI coach route error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile completare l'analisi del coach." },
      { status: 500 }
    );
  }
}
