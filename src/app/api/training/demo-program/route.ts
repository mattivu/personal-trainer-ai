import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildQuestionnaireProfile } from "@/lib/onboarding/questionnaire-profile";
import { generateRuleBasedProgram } from "@/lib/training-engine/generate-program";
import { buildNormalizedOnboardingProfile } from "@/lib/training-engine/onboarding-profile";
import { validateGeneratedProgramConsistency } from "@/lib/training-engine/program-consistency";
import {
  buildProgramGenerationProfile,
  mapQuestionnaireGoalToTrainingGoal,
} from "@/lib/training-engine/program-generation-profile";
import {
  getTrainingBlockDates,
  getTrainingBlockDurationWeeks,
} from "@/lib/training-engine/program-block";
import { buildTrainingStrategy } from "@/lib/training-engine/training-strategy";
import type { EngineExercise } from "@/lib/training-engine/types";

export const runtime = "nodejs";
const CURRENT_TRAINING_ENGINE_SOURCE = "rules_v2";

function buildProgramConsistencyErrorMessage(report: {
  expectedWeeklyTrainingDays: number;
  actualWorkoutCount: number;
  warnings: string[];
}) {
  if (report.warnings.includes("workout_count_exceeds_weekly_training_days")) {
    return `Non sono riuscito a creare un programma coerente con i giorni selezionati (${report.expectedWeeklyTrainingDays}). Sono state preparate ${report.actualWorkoutCount} sedute invece di quelle attese. Controlla le tue risposte iniziali o riprova.`;
  }

  if (report.warnings.includes("cardio_missing_from_generated_program")) {
    return "Non sono riuscito a integrare il cardio mantenendo il programma coerente. Controlla le tue risposte iniziali o riprova.";
  }

  return "Non sono riuscito a creare un programma coerente con i giorni selezionati. Controlla le tue risposte iniziali o riprova.";
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

  if (!exercise) {
    throw new Error(
      `Programma non persistibile: nessun Exercise reale trovato per "${input.nameFallback}".`
    );
  }

  return {
    exerciseId: exercise.id,
    name: exercise.name,
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
          message: "Completa le risposte iniziali prima di creare il programma.",
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

    const onboardingProfile = buildNormalizedOnboardingProfile(
      onboardingAnswers.map((answer) => answer.answersJson)
    );
    const questionnaireProfile = buildQuestionnaireProfile(
      onboardingProfile.mergedAnswers
    );
    const trainingStrategy = buildTrainingStrategy(questionnaireProfile);
    const generationProfile = buildProgramGenerationProfile(
      questionnaireProfile,
      onboardingProfile.profile
    );
    const generationAvailabilityProfile = {
      profile: generationProfile,
      mergedAnswers: onboardingProfile.mergedAnswers,
    };
    const { snapshotHash } = onboardingProfile;
    const exercises = await prisma.exercise.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        primaryMuscle: true,
        secondaryMuscles: true,
        equipment: true,
        difficulty: true,
        movementPattern: true,
        environments: true,
        tags: true,
        alternatives: true,
        contraindications: true,
        externalSource: true,
        externalId: true,
        imageUrls: true,
        sourceMetadata: true,
        importedAt: true,
      },
    });
    const programBlueprint = generateRuleBasedProgram(
      generationAvailabilityProfile,
      exercises as EngineExercise[],
      {
        trainingStrategy,
      }
    );
    const consistencyReport = validateGeneratedProgramConsistency(
      programBlueprint,
      trainingStrategy
    );

    if (
      consistencyReport.actualWorkoutCount > consistencyReport.expectedWeeklyTrainingDays
    ) {
      throw new Error(buildProgramConsistencyErrorMessage(consistencyReport));
    }

    if (
      trainingStrategy.cardio.weeklySessions > 0 &&
      consistencyReport.cardioSlotCount === 0
    ) {
      throw new Error(buildProgramConsistencyErrorMessage(consistencyReport));
    }

    const exerciseMap = new Map(
      exercises.map((exercise) => [
        exercise.slug,
        {
          id: exercise.id,
          name: exercise.name,
        },
      ])
    );

    const currentActiveProgram = await prisma.trainingProgram.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
      select: {
        id: true,
        onboardingSnapshotHash: true,
        source: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const hasCurrentActiveProgram = Boolean(currentActiveProgram);
    const snapshotMatches =
      currentActiveProgram?.onboardingSnapshotHash === snapshotHash;
    const engineAlreadyCurrent =
      currentActiveProgram?.source === CURRENT_TRAINING_ENGINE_SOURCE;

    if (hasCurrentActiveProgram && snapshotMatches && engineAlreadyCurrent) {
      return NextResponse.json(
        {
          ok: false,
          code: "ACTIVE_PROGRAM_ALREADY_CURRENT",
          message:
            "Il programma attivo e gia allineato alle tue risposte attuali.",
        },
        { status: 409 }
      );
    }

    const program = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const durationWeeks = getTrainingBlockDurationWeeks(
        mapQuestionnaireGoalToTrainingGoal(questionnaireProfile.goal.primary)
      );
      const blockDates = getTrainingBlockDates(now, durationWeeks);

      if (currentActiveProgram) {
        await tx.trainingProgram.updateMany({
          where: {
            userId: user.id,
            status: "active",
          },
          data: {
            status: "archived",
            endDate: now,
          },
        });
      }

      return tx.trainingProgram.create({
        data: {
          userId: user.id,
          title: programBlueprint.title,
          goal: programBlueprint.goal,
          status: "active",
          source: CURRENT_TRAINING_ENGINE_SOURCE,
          startDate: now,
          durationWeeks,
          startedAt: blockDates.startedAt,
          plannedReviewAt: blockDates.plannedReviewAt,
          onboardingSnapshotHash: snapshotHash,
          revisionReason: !currentActiveProgram
            ? "initial"
            : snapshotMatches
              ? "engine_updated"
              : "onboarding_changed",
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
      message: "Blocco di allenamento creato",
      programId: program.id,
    });
  } catch (error) {
    console.error("DEMO_PROGRAM_ROUTE_ERROR", error);

    const message =
      error instanceof Error
        ? error.message
        : "Errore durante la creazione del programma.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}
