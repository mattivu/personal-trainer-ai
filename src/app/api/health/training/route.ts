import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [exercises, programs, workoutLogs] = await prisma.$transaction([
      prisma.exercise.count(),
      prisma.trainingProgram.count(),
      prisma.workoutLog.count(),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Training schema connected",
      counts: {
        exercises,
        programs,
        workoutLogs,
      },
    });
  } catch (error) {
    console.error("TRAINING_SCHEMA_HEALTH_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Training schema check failed",
      },
      { status: 500 }
    );
  }
}
