import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { buildAdaptiveNutritionReview } from "@/lib/nutrition/adaptive-engine";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
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

    let body: {
      confirm?: unknown;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch (error) {
      if (isJsonSyntaxError(error)) {
        return NextResponse.json(
          { ok: false, message: "Payload JSON non valido." },
          { status: 400 }
        );
      }

      throw error;
    }

    if (body.confirm !== true) {
      return NextResponse.json(
        { ok: false, message: "Conferma esplicita richiesta per applicare l'aggiustamento." },
        { status: 400 }
      );
    }

    const review = await buildAdaptiveNutritionReview(user.id);

    if (review.status !== "adjustment_recommended" || !review.proposedTargets) {
      return NextResponse.json(
        { ok: false, message: "Non c'e un aggiustamento valido da applicare in questo momento." },
        { status: 400 }
      );
    }

    const updatedProfile = await prisma.nutritionProfile.update({
      where: {
        userId: user.id,
      },
      data: {
        calorieTarget: review.proposedTargets.calories,
        proteinTarget: review.proposedTargets.protein,
        carbsTarget: review.proposedTargets.carbs,
        fatTarget: review.proposedTargets.fat,
      },
      select: {
        calorieTarget: true,
        proteinTarget: true,
        carbsTarget: true,
        fatTarget: true,
        updatedAt: true,
      },
    });

    revalidatePath("/nutrition");
    revalidatePath("/nutrition/weekly-review");
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
      target: updatedProfile,
      message: "Nuovo target nutrizionale applicato. Pasti e peso non sono stati modificati.",
    });
  } catch (error) {
    console.error("Apply adaptive nutrition adjustment POST error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile applicare l'aggiustamento." },
      { status: 500 }
    );
  }
}

