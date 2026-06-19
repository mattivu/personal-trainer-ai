import { NextResponse } from "next/server";
import { buildAdaptiveNutritionReview } from "@/lib/nutrition/adaptive-engine";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const review = await buildAdaptiveNutritionReview(user.id);

    return NextResponse.json({
      ok: true,
      review,
    });
  } catch (error) {
    console.error("Adaptive nutrition review GET error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile recuperare la revisione adattiva." },
      { status: 500 }
    );
  }
}

