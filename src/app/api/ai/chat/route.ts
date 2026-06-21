import { NextResponse } from "next/server";
import { APIError } from "openai";
import { generateCoachActions } from "@/lib/ai/coach-actions";
import { buildCoachContext, CoachContextError } from "@/lib/ai/coach-context";
import type { CoachAction } from "@/lib/ai/coach-action-types";
import {
  buildCoachChatPrompt,
  COACH_CHAT_SYSTEM_PROMPT,
  type CoachChatMessage,
} from "@/lib/ai/coach-prompts";
import {
  AIConfigurationError,
  getOpenAIClient,
  getOpenAIModel,
} from "@/lib/ai/openai-client";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 800;

type RawBody = {
  messages?: unknown;
  currentWorkoutId?: unknown;
};

type CoachChatSuccessResponse = {
  ok: true;
  message: {
    role: "assistant";
    content: string;
  };
  actions: CoachAction[];
};

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

function sanitizeMessageContent(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_MESSAGE_LENGTH);
}

function parseMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedMessages = value
    .slice(-MAX_MESSAGES)
    .map((entry): CoachChatMessage | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const role = "role" in entry ? entry.role : undefined;
      const content = "content" in entry ? entry.content : undefined;

      if (role !== "user" && role !== "assistant") {
        return null;
      }

      const sanitizedContent = sanitizeMessageContent(content);

      if (!sanitizedContent) {
        return null;
      }

      return {
        role,
        content: sanitizedContent,
      };
    })
    .filter((entry): entry is CoachChatMessage => entry !== null);

  if (!normalizedMessages.some((message) => message.role === "user")) {
    return null;
  }

  return normalizedMessages;
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

    const messages = parseMessages(body.messages);

    if (!messages) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "messages non valido. Invia almeno un messaggio utente e massimo gli ultimi 8 messaggi.",
        },
        { status: 400 }
      );
    }

    const currentWorkoutId = parseOptionalId(body.currentWorkoutId);

    if (currentWorkoutId === null) {
      return NextResponse.json(
        { ok: false, message: "currentWorkoutId non valido." },
        { status: 400 }
      );
    }

    const context = await buildCoachContext({
      userId: user.id,
      mode: "chat",
      workoutId: currentWorkoutId,
    });

    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      instructions: COACH_CHAT_SYSTEM_PROMPT,
      input: buildCoachChatPrompt(context, messages),
      text: {
        verbosity: "low",
      },
    });

    const content = response.output_text?.trim();

    if (!content) {
      throw new Error("Risposta del coach vuota.");
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const actions = latestUserMessage
      ? await generateCoachActions({
          userId: user.id,
          latestUserMessage: latestUserMessage.content,
          context,
        })
      : [];

    const payload: CoachChatSuccessResponse = {
      ok: true,
      message: {
        role: "assistant",
        content,
      },
      actions,
    };

    return NextResponse.json(payload);
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
      console.error("AI chat OpenAI error", {
        status: error.status,
        name: error.name,
        message: error.message,
      });

      return NextResponse.json(
        { ok: false, message: "Coach temporaneamente non disponibile." },
        { status: 502 }
      );
    }

    console.error("AI chat route error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile completare la risposta del coach." },
      { status: 500 }
    );
  }
}
