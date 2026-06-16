import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOnboardingSafety } from "@/lib/onboarding-safety";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

function mergeOnboardingAnswers(answers: unknown[]) {
  return answers.reduce<Record<string, unknown>>((merged, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return merged;
    }

    return {
      ...merged,
      ...item,
    };
  }, {});
}

export async function POST() {
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

    const savedAnswers = await prisma.onboardingAnswer.findMany({
      where: {
        userId: user.id,
      },
      select: {
        answersJson: true,
      },
    });
    const mergedAnswers = mergeOnboardingAnswers(
      savedAnswers.map((answer) => answer.answersJson)
    );
    const safety = validateOnboardingSafety(mergedAnswers);

    if (safety.status === "blocked") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Il completamento onboarding e stato bloccato dal controllo di sicurezza.",
          message: "Il completamento onboarding e stato bloccato dal controllo di sicurezza.",
          safety,
        },
        { status: 400 }
      );
    }

    const completedAt = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          onboardingStatus: "completed",
        },
      }),
      prisma.onboardingAnswer.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          completedAt,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, safety });
  } catch (error) {
    console.error("ONBOARDING_COMPLETE_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore durante il completamento dell’onboarding.",
        message: "Errore durante il completamento dell’onboarding.",
      },
      { status: 500 }
    );
  }
}
