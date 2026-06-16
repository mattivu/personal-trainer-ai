import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { generateRuleBasedProgram } from "@/lib/training-engine/generate-program";
import { normalizeOnboardingAnswers } from "@/lib/training-engine/normalize-onboarding";
import type { EngineExercise } from "@/lib/training-engine/types";

export const runtime = "nodejs";

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

function resolveDemoExercise(
  exerciseMap: Map<string, { id: number; name: string }>,
  input: {
    slugCandidates: string[];
    nameFallback: string;
    sets: number;
    reps: string;
    restSeconds: number;
    intensity: string;
    notes: string;
  }
) {
  const match = input.slugCandidates.find((slug) => exerciseMap.has(slug));
  const exercise = match ? exerciseMap.get(match) : null;

  return {
    exerciseId: exercise?.id ?? null,
    name: exercise?.name ?? input.nameFallback,
    sets: input.sets,
    reps: input.reps,
    restSeconds: input.restSeconds,
    intensity: input.intensity,
    notes: input.notes,
  };
}

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "Utente non autenticato.",
        },
        { status: 401 }
      );
    }

    if (user.onboardingStatus !== "completed") {
      return NextResponse.json(
        {
          ok: false,
          message: "Completa il questionario prima di creare il programma.",
        },
        { status: 403 }
      );
    }

    const onboardingAnswers = await prisma.onboardingAnswer.findMany({
      where: {
        userId: user.id,
      },
      select: {
        answersJson: true,
      },
    });

    const mergedAnswers = mergeOnboardingAnswers(
      onboardingAnswers.map((answer) => answer.answersJson)
    );
    const profile = normalizeOnboardingAnswers(mergedAnswers);

    const exercises = await prisma.exercise.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        primaryMuscle: true,
        equipment: true,
        difficulty: true,
        movementPattern: true,
      },
    });
    const programBlueprint = generateRuleBasedProgram(
      profile,
      exercises as EngineExercise[]
    );

    const exerciseMap = new Map(
      exercises.map((exercise) => [
        exercise.slug,
        {
          id: exercise.id,
          name: exercise.name,
        },
      ])
    );

    const program = await prisma.$transaction(async (tx) => {
      await tx.trainingProgram.updateMany({
        where: {
          userId: user.id,
          status: "active",
        },
        data: {
          status: "archived",
          endDate: new Date(),
        },
      });

      return tx.trainingProgram.create({
        data: {
          userId: user.id,
          title: programBlueprint.title,
          goal: programBlueprint.goal,
          status: "active",
          source: "rules_v1",
          startDate: new Date(),
          notes: programBlueprint.notes,
          workouts: {
            create: programBlueprint.workouts.map((workout, workoutIndex) => ({
              title: workout.title,
              dayLabel: `Workout ${workoutIndex + 1}`,
              focus: workout.focus,
              sortOrder: workoutIndex + 1,
              estimatedMinutes: workout.estimatedMinutes,
              notes: workout.notes,
              exercises: {
                create: workout.exercises.map((exercise, exerciseIndex) => {
                  const resolvedExercise = resolveDemoExercise(
                    exerciseMap,
                    exercise
                  );

                  return {
                    ...resolvedExercise,
                    sortOrder: exerciseIndex + 1,
                  };
                }),
              },
            })),
          },
        },
        select: {
          id: true,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/program");

    return NextResponse.json({
      ok: true,
      message: "Programma rule-based creato",
      programId: program.id,
    });
  } catch (error) {
    console.error("DEMO_PROGRAM_ROUTE_ERROR", error);

    const message =
      error instanceof Error
        ? error.message
        : "Errore durante la creazione del programma demo.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}
