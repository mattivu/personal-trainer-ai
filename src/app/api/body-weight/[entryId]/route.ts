import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  getBodyWeightEntryDate,
  validateBodyWeightInput,
} from "@/lib/body-weight";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

function parseEntryId(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function getOwnedEntry(userId: number, entryId: number) {
  return prisma.bodyWeightEntry.findFirst({
    where: {
      id: entryId,
      userId,
    },
  });
}

function handlePrismaError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "Esiste gia una pesata per questa data. Modifica quella esistente.",
      },
      { status: 409 }
    );
  }

  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { entryId: rawEntryId } = await context.params;
    const entryId = parseEntryId(rawEntryId);

    if (!entryId) {
      return NextResponse.json(
        { ok: false, message: "ID pesata non valido." },
        { status: 400 }
      );
    }

    const existingEntry = await getOwnedEntry(user.id, entryId);

    if (!existingEntry) {
      return NextResponse.json(
        { ok: false, message: "Pesata non trovata." },
        { status: 404 }
      );
    }

    let body: {
      date?: unknown;
      weightKg?: unknown;
      notes?: unknown;
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

    const validatedInput = validateBodyWeightInput(body);

    if (!validatedInput.ok) {
      return NextResponse.json(
        { ok: false, message: validatedInput.message },
        { status: 400 }
      );
    }

    const nextDate = getBodyWeightEntryDate(validatedInput.value.date);
    const conflictingEntry = await prisma.bodyWeightEntry.findFirst({
      where: {
        userId: user.id,
        date: nextDate,
        id: {
          not: entryId,
        },
      },
      select: {
        id: true,
      },
    });

    if (conflictingEntry) {
      return NextResponse.json(
        {
          ok: false,
          message: "Esiste gia una pesata per questa data. Modifica quella esistente.",
        },
        { status: 409 }
      );
    }

    const updatedEntry = await prisma.bodyWeightEntry.update({
      where: {
        id: entryId,
      },
      data: {
        date: nextDate,
        weightKg: validatedInput.value.weightKg,
        notes: validatedInput.value.notes,
      },
    });

    revalidatePath("/body-weight");
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
      entry: updatedEntry,
    });
  } catch (error) {
    const prismaResponse = handlePrismaError(error);

    if (prismaResponse) {
      return prismaResponse;
    }

    console.error("Body weight PATCH error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile aggiornare la pesata." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { entryId: rawEntryId } = await context.params;
    const entryId = parseEntryId(rawEntryId);

    if (!entryId) {
      return NextResponse.json(
        { ok: false, message: "ID pesata non valido." },
        { status: 400 }
      );
    }

    const existingEntry = await getOwnedEntry(user.id, entryId);

    if (!existingEntry) {
      return NextResponse.json(
        { ok: false, message: "Pesata non trovata." },
        { status: 404 }
      );
    }

    await prisma.bodyWeightEntry.delete({
      where: {
        id: entryId,
      },
    });

    revalidatePath("/body-weight");
    revalidatePath("/dashboard");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Body weight DELETE error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile eliminare la pesata." },
      { status: 500 }
    );
  }
}
