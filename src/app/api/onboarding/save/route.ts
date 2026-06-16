import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const step = String(body.step ?? "").trim();
    const answers = body.answers as Prisma.InputJsonValue | undefined;

    if (!step) {
      return NextResponse.json(
        { ok: false, message: "Step non valido." },
        { status: 400 }
      );
    }

    if (answers === undefined) {
      return NextResponse.json(
        { ok: false, message: "Risposte mancanti." },
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
          answersJson: answers,
        },
        update: {
          answersJson: answers,
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
      { ok: false, message: "Errore durante il salvataggio onboarding." },
      { status: 500 }
    );
  }
}
