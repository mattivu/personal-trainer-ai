import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateOnboardingSafety } from "@/lib/onboarding-safety";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const STEP_BLOCKING_CODES: Partial<Record<string, string[]>> = {
  "dati-base": ["AGE_UNDER_14_BLOCKED"],
  obiettivo: [
    "TARGET_BMI_TOO_LOW",
    "CURRENT_UNDERWEIGHT_WEIGHT_LOSS_BLOCKED",
    "AGGRESSIVE_WEIGHT_LOSS_TIMELINE",
  ],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeOnboardingAnswers(answers: unknown[]) {
  return answers.reduce<Record<string, unknown>>((merged, item) => {
    if (!isPlainObject(item)) {
      return merged;
    }

    return {
      ...merged,
      ...item,
    };
  }, {});
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Utente non autenticato.",
          message: "Utente non autenticato.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const step = String(body.step ?? "").trim();
    const answers = body.answers;

    if (!step) {
      return NextResponse.json(
        { ok: false, error: "Step non valido.", message: "Step non valido." },
        { status: 400 }
      );
    }

    if (!isPlainObject(answers)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Risposte mancanti o non valide.",
          message: "Risposte mancanti o non valide.",
        },
        { status: 400 }
      );
    }

    const savedAnswers = await prisma.onboardingAnswer.findMany({
      where: {
        userId: user.id,
      },
      select: {
        answersJson: true,
      },
    });
    const mergedAnswers = {
      ...mergeOnboardingAnswers(savedAnswers.map((answer) => answer.answersJson)),
      ...answers,
    };
    const safety = validateOnboardingSafety(mergedAnswers);
    const blockedCodesForStep = STEP_BLOCKING_CODES[step] ?? [];
    const isBlockedForStep = safety.codes.some((code) =>
      blockedCodesForStep.includes(code)
    );

    if (isBlockedForStep) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Il salvataggio di questo step e stato bloccato dal controllo di sicurezza.",
          message:
            "Il salvataggio di questo step e stato bloccato dal controllo di sicurezza.",
          safety,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.onboardingAnswer.upsert({
        where: {
          userId_step: {
            userId: user.id,
            step,
          },
        },
        create: {
          userId: user.id,
          step,
          answersJson: answers as Prisma.InputJsonValue,
        },
        update: {
          answersJson: answers as Prisma.InputJsonValue,
        },
      }),
      prisma.user.updateMany({
        where: {
          id: user.id,
          onboardingStatus: {
            not: "completed",
          },
        },
        data: {
          onboardingStatus: "in_progress",
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ONBOARDING_SAVE_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore durante il salvataggio dell’onboarding.",
        message: "Errore durante il salvataggio dell’onboarding.",
      },
      { status: 500 }
    );
  }
}
