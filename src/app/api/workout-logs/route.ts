import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getCurrentDayBounds,
  getWorkoutPageDataForUser,
} from "@/lib/workout-execution";

export const runtime = "nodejs";

type RawSetLog = {
  programExerciseId?: unknown;
  setNumber?: unknown;
  actualWeight?: unknown;
  actualReps?: unknown;
  actualRir?: unknown;
  actualRpe?: unknown;
  completed?: unknown;
  notes?: unknown;
};

type ParsedSetLog = {
  programExerciseId: number;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  actualRir: number | null;
  hasActualRpe: boolean;
  actualRpe: number | null;
  completed: boolean;
  notes: string | null;
};

function parseOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

function parseOptionalString(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function parseSetLogs(value: unknown) {
  if (!Array.isArray(value)) {
    return {
      ok: false as const,
      error: "I dati delle serie devono essere inviati come array.",
    };
  }

  const parsedSetLogs: ParsedSetLog[] = [];

  for (const rawSetLog of value) {
    if (!rawSetLog || typeof rawSetLog !== "object" || Array.isArray(rawSetLog)) {
      return {
        ok: false as const,
        error: "Ogni serie deve avere dati validi.",
      };
    }

    const setLog = rawSetLog as RawSetLog;
    const programExerciseId = Number(setLog.programExerciseId);
    const setNumber = Number(setLog.setNumber);

    if (!Number.isInteger(programExerciseId) || programExerciseId <= 0) {
      return {
        ok: false as const,
        error: "Riferimento esercizio non valido nei dati delle serie.",
      };
    }

    if (!Number.isInteger(setNumber) || setNumber <= 0) {
      return {
        ok: false as const,
        error: "Numero serie non valido.",
      };
    }

    const actualWeight = parseOptionalNumber(setLog.actualWeight);
    const actualReps = parseOptionalNumber(setLog.actualReps);
    const actualRir = parseOptionalNumber(setLog.actualRir);
    const actualRpe = parseOptionalNumber(setLog.actualRpe);
    const notes = parseOptionalString(setLog.notes);

    if (setLog.actualWeight !== undefined && setLog.actualWeight !== null && actualWeight === null) {
      return {
        ok: false as const,
        error: "Valore kg non valido nei dati della serie.",
      };
    }

    if (setLog.actualReps !== undefined && setLog.actualReps !== null && actualReps === null) {
      return {
        ok: false as const,
        error: "Valore ripetizioni non valido nei dati della serie.",
      };
    }

    if (setLog.actualRir !== undefined && setLog.actualRir !== null && actualRir === null) {
      return {
        ok: false as const,
        error: "Valore RIR non valido nei dati della serie.",
      };
    }

    if (setLog.actualRpe !== undefined && setLog.actualRpe !== null && actualRpe === null) {
      return {
        ok: false as const,
        error: "Valore di fatica della serie non valido.",
      };
    }

    if (typeof setLog.completed !== "boolean") {
      return {
        ok: false as const,
        error: "completed deve essere boolean.",
      };
    }

    if (actualWeight !== null && actualWeight < 0) {
      return {
        ok: false as const,
        error: "actualWeight non puo essere negativo.",
      };
    }

    if (actualReps !== null && actualReps < 0) {
      return {
        ok: false as const,
        error: "actualReps non puo essere negativo.",
      };
    }

    if (actualRir !== null && actualRir < 0) {
      return {
        ok: false as const,
        error: "actualRir non puo essere negativo.",
      };
    }

    if (actualRpe !== null && (actualRpe < 0 || actualRpe > 10)) {
      return {
        ok: false as const,
        error: "Il valore di fatica della serie deve essere compreso tra 0 e 10.",
      };
    }

    parsedSetLogs.push({
      programExerciseId,
      setNumber,
      actualWeight,
      actualReps:
        actualReps === null ? null : Math.max(0, Math.trunc(actualReps)),
      actualRir: actualRir === null ? null : Math.max(0, Math.trunc(actualRir)),
      hasActualRpe: setLog.actualRpe !== undefined,
      actualRpe: actualRpe === null ? null : Math.max(0, Math.trunc(actualRpe)),
      completed: setLog.completed,
      notes,
    });
  }

  return {
    ok: true as const,
    data: parsedSetLogs,
  };
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
      workoutId?: unknown;
      status?: unknown;
      perceivedEffort?: unknown;
      notes?: unknown;
      setLogs?: unknown;
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

    const workoutId = Number(body.workoutId);
    const status = body.status;
    const perceivedEffort = parseOptionalNumber(body.perceivedEffort);
    const notes = parseOptionalString(body.notes);

    if (!Number.isInteger(workoutId) || workoutId <= 0) {
      return NextResponse.json(
        { ok: false, message: "workoutId non valido." },
        { status: 400 }
      );
    }

    if (status !== "in_progress" && status !== "completed") {
      return NextResponse.json(
        { ok: false, message: "status non valido." },
        { status: 400 }
      );
    }

    if (
      body.perceivedEffort !== undefined &&
      body.perceivedEffort !== null &&
      perceivedEffort === null
    ) {
      return NextResponse.json(
        { ok: false, message: "perceivedEffort non valido." },
        { status: 400 }
      );
    }

    if (perceivedEffort !== null && (perceivedEffort < 1 || perceivedEffort > 10)) {
      return NextResponse.json(
        { ok: false, message: "perceivedEffort deve essere compreso tra 1 e 10." },
        { status: 400 }
      );
    }

    if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json(
        { ok: false, message: "notes non valido." },
        { status: 400 }
      );
    }

    const parsedSetLogs = parseSetLogs(body.setLogs);

    if (!parsedSetLogs.ok) {
      return NextResponse.json(
        { ok: false, message: parsedSetLogs.error },
        { status: 400 }
      );
    }

    const workoutData = await getWorkoutPageDataForUser(user.id, workoutId);

    if (!workoutData) {
      const workoutExists = await prisma.programWorkout.findUnique({
        where: {
          id: workoutId,
        },
        select: {
          id: true,
          program: {
            select: {
              userId: true,
              status: true,
            },
          },
        },
      });

      if (!workoutExists || workoutExists.program.userId !== user.id) {
        return NextResponse.json(
          { ok: false, message: "Workout non trovato." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: false, message: "Il workout non appartiene al programma attivo." },
        { status: 403 }
      );
    }

    const allowedExerciseIds = new Set(workoutData.exercises.map((exercise) => exercise.id));

    for (const setLog of parsedSetLogs.data) {
      if (!allowedExerciseIds.has(setLog.programExerciseId)) {
        return NextResponse.json(
          {
            ok: false,
            message: "I dati delle serie contengono esercizi non validi per questo workout.",
          },
          { status: 400 }
        );
      }
    }

    const { start, end } = getCurrentDayBounds();
    const now = new Date();

    const workoutLog = await prisma.$transaction(async (tx) => {
      const existingWorkoutLog = await tx.workoutLog.findFirst({
        where: {
          userId: user.id,
          workoutId,
          performedAt: {
            gte: start,
            lt: end,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          setLogs: true,
        },
      });

      const existingRpeBySetKey = new Map(
        (existingWorkoutLog?.setLogs ?? []).map((setLog) => [
          `${setLog.programExerciseId}:${setLog.setNumber}`,
          setLog.rpe,
        ])
      );

      const setLogsData = parsedSetLogs.data.map((setLog) => ({
        programExerciseId: setLog.programExerciseId,
        setNumber: setLog.setNumber,
        plannedReps:
          workoutData.exercises.find(
            (exercise) => exercise.id === setLog.programExerciseId
          )?.reps ?? null,
        actualReps: setLog.actualReps,
        weightKg: setLog.actualWeight,
        rir: setLog.actualRir,
        rpe: setLog.hasActualRpe
          ? setLog.actualRpe
          : (existingRpeBySetKey.get(
              `${setLog.programExerciseId}:${setLog.setNumber}`
            ) ?? null),
        completed: setLog.completed,
        notes: setLog.notes,
      }));

      if (existingWorkoutLog) {
        return tx.workoutLog.update({
          where: {
            id: existingWorkoutLog.id,
          },
          data: {
            programId: workoutData.programId,
            status,
            perceivedEffort:
              perceivedEffort === null ? null : Math.max(1, Math.trunc(perceivedEffort)),
            notes,
            completedAt: status === "completed" ? now : null,
            setLogs: {
              deleteMany: {},
              create: setLogsData,
            },
          },
          select: {
            id: true,
          },
        });
      }

      return tx.workoutLog.create({
        data: {
          userId: user.id,
          programId: workoutData.programId,
          workoutId,
          performedAt: now,
          startedAt: now,
          completedAt: status === "completed" ? now : null,
          status,
          perceivedEffort:
            perceivedEffort === null ? null : Math.max(1, Math.trunc(perceivedEffort)),
          notes,
          setLogs: {
            create: setLogsData,
          },
        },
        select: {
          id: true,
        },
      });
    });

    revalidatePath("/program");
    revalidatePath(`/workouts/${workoutId}`);
    revalidatePath("/dashboard");
    revalidatePath("/workout-history");

    return NextResponse.json({
      ok: true,
      workoutLogId: workoutLog.id,
      message: status === "completed" ? "Allenamento completato." : "Progressi salvati.",
    });
  } catch (error) {
    console.error("WORKOUT_LOGS_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante il salvataggio dei progressi." },
      { status: 500 }
    );
  }
}
