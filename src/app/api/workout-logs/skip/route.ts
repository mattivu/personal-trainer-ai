import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getCurrentWeekBounds } from "@/lib/workout-execution";

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

    const body = (await request.json().catch(() => null)) as {
      workoutId?: unknown;
    } | null;
    const workoutId = Number(body?.workoutId);

    if (!Number.isInteger(workoutId) || workoutId <= 0) {
      return NextResponse.json(
        { ok: false, message: "workoutId non valido." },
        { status: 400 }
      );
    }

    const workout = await prisma.programWorkout.findFirst({
      where: {
        id: workoutId,
        program: {
          userId: user.id,
          status: "active",
        },
      },
      select: {
        id: true,
        programId: true,
      },
    });

    if (!workout) {
      return NextResponse.json(
        { ok: false, message: "Workout non trovato." },
        { status: 404 }
      );
    }

    const now = new Date();
    const { start, end } = getCurrentWeekBounds(now);

    const result = await prisma.$transaction(async (tx) => {
      const existingWorkoutLog = await tx.workoutLog.findFirst({
        where: {
          userId: user.id,
          workoutId,
          performedAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        include: {
          setLogs: {
            select: {
              id: true,
            },
          },
        },
      });

      if (existingWorkoutLog?.status === "completed") {
        return {
          conflict: true as const,
        };
      }

      if (existingWorkoutLog) {
        await tx.workoutLog.update({
          where: {
            id: existingWorkoutLog.id,
          },
          data: {
            programId: workout.programId,
            status: "skipped",
            performedAt: now,
            startedAt: null,
            completedAt: null,
            perceivedEffort: null,
            notes: null,
            setLogs: {
              deleteMany: {},
            },
          },
        });

        return {
          conflict: false as const,
        };
      }

      await tx.workoutLog.create({
        data: {
          userId: user.id,
          programId: workout.programId,
          workoutId,
          performedAt: now,
          status: "skipped",
        },
      });

      return {
        conflict: false as const,
      };
    });

    if (result.conflict) {
      return NextResponse.json(
        { ok: false, message: "La seduta è già stata completata." },
        { status: 409 }
      );
    }

    revalidatePath("/program");
    revalidatePath(`/workouts/${workoutId}`);
    revalidatePath("/dashboard");
    revalidatePath("/workout-history");

    return NextResponse.json({
      ok: true,
      message: "Seduta segnata come saltata",
    });
  } catch (error) {
    console.error("WORKOUT_SKIP_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante l'aggiornamento della seduta." },
      { status: 500 }
    );
  }
}
