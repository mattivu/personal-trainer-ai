import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ONBOARDING_COMPLETE_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante il completamento onboarding." },
      { status: 500 }
    );
  }
}
