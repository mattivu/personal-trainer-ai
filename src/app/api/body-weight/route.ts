import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  getBodyWeightEntryDate,
  getBodyWeightOverviewForUser,
  validateBodyWeightInput,
} from "@/lib/body-weight";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const overview = await getBodyWeightOverviewForUser(user.id);

    return NextResponse.json({
      ok: true,
      entries: overview.entries,
      summary: overview.summary,
    });
  } catch (error) {
    console.error("Body weight GET error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile recuperare le pesate." },
      { status: 500 }
    );
  }
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

    const savedEntry = await prisma.bodyWeightEntry.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: getBodyWeightEntryDate(validatedInput.value.date),
        },
      },
      update: {
        weightKg: validatedInput.value.weightKg,
        notes: validatedInput.value.notes,
      },
      create: {
        userId: user.id,
        date: getBodyWeightEntryDate(validatedInput.value.date),
        weightKg: validatedInput.value.weightKg,
        notes: validatedInput.value.notes,
      },
    });

    revalidatePath("/body-weight");
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
      entry: savedEntry,
    });
  } catch (error) {
    console.error("Body weight POST error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile salvare la pesata." },
      { status: 500 }
    );
  }
}
