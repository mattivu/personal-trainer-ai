import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  buildSwapMetadata,
  countWorkoutSetLogsForProgramExercise,
  getExerciseAlternativesForUser,
  parseExerciseSwapReason,
} from "@/lib/exercise-swaps";

export const runtime = "nodejs";

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function parseNeedsTranslation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return (value as { needsTranslation?: unknown }).needsTranslation === true;
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

    const body = (await request.json()) as {
      programExerciseId?: unknown;
      newExerciseId?: unknown;
      reason?: unknown;
    };

    const programExerciseId = Number(body.programExerciseId);
    const newExerciseId = Number(body.newExerciseId);
    const reason = parseExerciseSwapReason(body.reason);

    if (!Number.isInteger(programExerciseId) || programExerciseId <= 0) {
      return NextResponse.json(
        { ok: false, message: "programExerciseId non valido." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(newExerciseId) || newExerciseId <= 0) {
      return NextResponse.json(
        { ok: false, message: "newExerciseId non valido." },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { ok: false, message: "reason non valido." },
        { status: 400 }
      );
    }

    const alternativesResult = await getExerciseAlternativesForUser(
      user.id,
      programExerciseId,
      reason
    );

    if (!alternativesResult) {
      return NextResponse.json(
        {
          ok: false,
          message: "Esercizio del programma non trovato o non sostituibile.",
        },
        { status: 404 }
      );
    }

    if (alternativesResult.workoutCompletedThisWeek) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Non puoi sostituire un esercizio in una seduta gia completata questa settimana.",
        },
        { status: 409 }
      );
    }

    const selectedAlternative = alternativesResult.alternatives.find(
      (alternative) => alternative.exerciseId === newExerciseId
    );

    if (!selectedAlternative) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "L'alternativa scelta non e disponibile per questa sostituzione.",
        },
        { status: 400 }
      );
    }

    const newExercise = await prisma.exercise.findUnique({
      where: {
        id: newExerciseId,
      },
      select: {
        id: true,
        name: true,
        category: true,
        primaryMuscle: true,
        secondaryMuscles: true,
        equipment: true,
        difficulty: true,
        instructions: true,
        imageUrls: true,
        sourceMetadata: true,
      },
    });

    if (!newExercise) {
      return NextResponse.json(
        { ok: false, message: "Nuovo esercizio non trovato." },
        { status: 404 }
      );
    }

    const currentProgramExercise = alternativesResult.programExercise;
    const existingSetLogCount = await countWorkoutSetLogsForProgramExercise(
      currentProgramExercise.id
    );
    const swapHistoryEntry = {
      swappedAt: new Date().toISOString(),
      reason,
      oldExerciseId: currentProgramExercise.exerciseId,
      newExerciseId: newExercise.id,
      oldExerciseName: currentProgramExercise.name,
      newExerciseName: newExercise.name,
    } as const;

    const updatedProgramExercise = await prisma.$transaction(async (tx) => {
      if (existingSetLogCount === 0) {
        return tx.programExercise.update({
          where: {
            id: currentProgramExercise.id,
          },
          data: {
            exerciseId: newExercise.id,
            name: newExercise.name,
            alternatives: buildSwapMetadata(
              currentProgramExercise.alternatives,
              alternativesResult.alternatives.map(
                (alternative) => alternative.exerciseId
              ),
              swapHistoryEntry
            ),
            replacementReason: reason,
          },
          select: {
            id: true,
            name: true,
            notes: true,
            exerciseId: true,
            exercise: {
              select: {
                category: true,
                primaryMuscle: true,
                secondaryMuscles: true,
                equipment: true,
                difficulty: true,
                instructions: true,
                imageUrls: true,
                sourceMetadata: true,
              },
            },
          },
        });
      }

      const createdProgramExercise = await tx.programExercise.create({
        data: {
          workoutId: currentProgramExercise.workout.id,
          exerciseId: newExercise.id,
          name: newExercise.name,
          sortOrder: currentProgramExercise.sortOrder,
          sets: currentProgramExercise.sets,
          reps: currentProgramExercise.reps,
          restSeconds: currentProgramExercise.restSeconds,
          tempo: currentProgramExercise.tempo,
          intensity: currentProgramExercise.intensity,
          notes: currentProgramExercise.notes,
          alternatives: buildSwapMetadata(
            currentProgramExercise.alternatives,
            alternativesResult.alternatives.map(
              (alternative) => alternative.exerciseId
            ),
            swapHistoryEntry
          ),
          replacementReason: reason,
        },
        select: {
          id: true,
        },
      });

      await tx.programExercise.update({
        where: {
          id: currentProgramExercise.id,
        },
        data: {
          isActive: false,
          replacedAt: new Date(swapHistoryEntry.swappedAt),
          replacedByProgramExerciseId: createdProgramExercise.id,
          replacementReason: reason,
        },
      });

      return tx.programExercise.findUniqueOrThrow({
        where: {
          id: createdProgramExercise.id,
        },
        select: {
          id: true,
          name: true,
          notes: true,
          exerciseId: true,
          exercise: {
            select: {
              category: true,
              primaryMuscle: true,
              secondaryMuscles: true,
              equipment: true,
              difficulty: true,
              instructions: true,
              imageUrls: true,
              sourceMetadata: true,
            },
          },
        },
      });
    });

    revalidatePath("/program");
    revalidatePath(`/workouts/${currentProgramExercise.workout.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/workout-history");

    return NextResponse.json({
      ok: true,
      message: "Esercizio sostituito. La modifica vale per questo programma.",
      swapSummary: `Sostituito da ${currentProgramExercise.name} a ${newExercise.name}.`,
      programExercise: {
        id: updatedProgramExercise.id,
        exerciseId: updatedProgramExercise.exerciseId,
        name: updatedProgramExercise.name,
        notes: parseOptionalString(updatedProgramExercise.notes),
        category: parseOptionalString(updatedProgramExercise.exercise?.category),
        primaryMuscle: parseOptionalString(
          updatedProgramExercise.exercise?.primaryMuscle
        ),
        secondaryMuscles: normalizeStringArray(
          updatedProgramExercise.exercise?.secondaryMuscles
        ),
        equipment: parseOptionalString(updatedProgramExercise.exercise?.equipment),
        difficulty: parseOptionalString(updatedProgramExercise.exercise?.difficulty),
        instructions: parseOptionalString(updatedProgramExercise.exercise?.instructions),
        imageUrls: normalizeStringArray(updatedProgramExercise.exercise?.imageUrls).slice(0, 2),
        needsTranslation: parseNeedsTranslation(updatedProgramExercise.exercise?.sourceMetadata),
      },
    });
  } catch (error) {
    console.error("PROGRAM_EXERCISE_SWAP_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante la sostituzione dell'esercizio." },
      { status: 500 }
    );
  }
}
