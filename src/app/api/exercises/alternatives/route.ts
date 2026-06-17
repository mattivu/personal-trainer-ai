import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  getAuthorizedProgramExerciseForUser,
  getExerciseAlternativesForUser,
  parseExerciseSwapReason,
} from "@/lib/exercise-swaps";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const programExerciseId = Number(
      request.nextUrl.searchParams.get("programExerciseId")
    );
    const reason =
      parseExerciseSwapReason(request.nextUrl.searchParams.get("reason")) ??
      "prefer_alternative";

    if (!Number.isInteger(programExerciseId) || programExerciseId <= 0) {
      return NextResponse.json(
        { ok: false, message: "programExerciseId non valido." },
        { status: 400 }
      );
    }

    const ownedProgramExercise = await getAuthorizedProgramExerciseForUser(
      user.id,
      programExerciseId
    );

    if (!ownedProgramExercise) {
      return NextResponse.json(
        { ok: false, message: "Esercizio del programma non trovato." },
        { status: 404 }
      );
    }

    const result = await getExerciseAlternativesForUser(
      user.id,
      programExerciseId,
      reason
    );

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          message: "Non ci sono dati sufficienti per proporre una sostituzione sicura.",
        },
        { status: 400 }
      );
    }

    if (result.workoutCompletedThisWeek) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Non puoi sostituire un esercizio in una seduta gia completata questa settimana.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      programExercise: {
        id: result.programExercise.id,
        name: result.programExercise.name,
      },
      alternatives: result.alternatives,
    });
  } catch (error) {
    console.error("EXERCISE_ALTERNATIVES_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante il recupero delle alternative." },
      { status: 500 }
    );
  }
}
