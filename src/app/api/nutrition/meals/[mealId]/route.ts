import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { validateMealInput } from "@/lib/nutrition/validation";

export const runtime = "nodejs";

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

function parseMealId(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function getOwnedMealEntry(userId: number, mealId: number) {
  return prisma.mealEntry.findFirst({
    where: {
      id: mealId,
      userId,
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ mealId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { mealId: rawMealId } = await context.params;
    const mealId = parseMealId(rawMealId);

    if (!mealId) {
      return NextResponse.json(
        { ok: false, message: "ID pasto non valido." },
        { status: 400 }
      );
    }

    const existingMeal = await getOwnedMealEntry(user.id, mealId);

    if (!existingMeal) {
      return NextResponse.json(
        { ok: false, message: "Pasto non trovato." },
        { status: 404 }
      );
    }

    let body: {
      mealType?: unknown;
      name?: unknown;
      quantityValue?: unknown;
      quantityUnit?: unknown;
      brand?: unknown;
      nutritionSource?: unknown;
      calories?: unknown;
      protein?: unknown;
      carbs?: unknown;
      fat?: unknown;
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

    const mealInput = validateMealInput(body);

    if (!mealInput.ok) {
      return NextResponse.json(
        { ok: false, message: mealInput.message },
        { status: 400 }
      );
    }

    const updatedMeal = await prisma.mealEntry.update({
      where: {
        id: mealId,
      },
      data: {
        mealType: mealInput.value.mealType,
        name: mealInput.value.name,
        quantityValue: mealInput.value.quantityValue,
        quantityUnit: mealInput.value.quantityUnit,
        brand: mealInput.value.brand,
        nutritionSource: mealInput.value.nutritionSource,
        calories: mealInput.value.calories,
        protein: mealInput.value.protein,
        carbs: mealInput.value.carbs,
        fat: mealInput.value.fat,
        notes: mealInput.value.notes,
      },
    });

    revalidatePath("/nutrition");

    return NextResponse.json({
      ok: true,
      meal: updatedMeal,
    });
  } catch (error) {
    console.error("Nutrition meal PATCH error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile aggiornare il pasto." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ mealId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { mealId: rawMealId } = await context.params;
    const mealId = parseMealId(rawMealId);

    if (!mealId) {
      return NextResponse.json(
        { ok: false, message: "ID pasto non valido." },
        { status: 400 }
      );
    }

    const existingMeal = await getOwnedMealEntry(user.id, mealId);

    if (!existingMeal) {
      return NextResponse.json(
        { ok: false, message: "Pasto non trovato." },
        { status: 404 }
      );
    }

    await prisma.mealEntry.delete({
      where: {
        id: mealId,
      },
    });

    revalidatePath("/nutrition");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Nutrition meal DELETE error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile eliminare il pasto." },
      { status: 500 }
    );
  }
}
