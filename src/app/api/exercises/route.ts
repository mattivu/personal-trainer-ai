import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ExerciseRecord = {
  primaryMuscle: string;
  secondaryMuscles: unknown;
};

function normalizeJsonArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function matchesMuscleFilter(exercise: ExerciseRecord, muscle: string) {
  const normalizedMuscle = muscle.toLowerCase();
  const secondaryMuscles = normalizeJsonArray(exercise.secondaryMuscles);

  return (
    exercise.primaryMuscle.toLowerCase().includes(normalizedMuscle) ||
    secondaryMuscles.some((item) => item.toLowerCase().includes(normalizedMuscle))
  );
}

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const category = request.nextUrl.searchParams.get("category")?.trim();
    const muscle = request.nextUrl.searchParams.get("muscle")?.trim();
    const equipment = request.nextUrl.searchParams.get("equipment")?.trim();

    const exercises = await prisma.exercise.findMany({
      where: {
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  slug: {
                    contains: search,
                  },
                },
              ],
            }
          : {}),
        ...(category
          ? {
              category: {
                equals: category,
              },
            }
          : {}),
        ...(equipment
          ? {
              equipment: {
                equals: equipment,
              },
            }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
    });

    const filteredExercises = muscle
      ? exercises.filter((exercise) => matchesMuscleFilter(exercise, muscle))
      : exercises;

    return NextResponse.json({
      ok: true,
      count: filteredExercises.length,
      exercises: filteredExercises,
    });
  } catch (error) {
    console.error("EXERCISES_ROUTE_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Exercises check failed",
      },
      { status: 500 }
    );
  }
}
