import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  getSafeNutritionDate,
  getTodayLocalDate,
  isValidDateKey,
} from "@/lib/nutrition/date";
import {
  parseRequiredString,
  validateMealInput,
} from "@/lib/nutrition/validation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  getDailyNutritionData,
  getDateRangeForLocalDay,
  getNutritionDailySummary,
  getOrCreateNutritionProfile,
} from "@/lib/nutrition/profile";

export const runtime = "nodejs";

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawDate = searchParams.get("date");
    const dateKey = rawDate ? getSafeNutritionDate(rawDate) : undefined;

    if (rawDate && !isValidDateKey(rawDate)) {
      return NextResponse.json(
        { ok: false, message: "date deve usare il formato YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (rawDate && !dateKey) {
      return NextResponse.json(
        { ok: false, message: "date non puo essere futura." },
        { status: 400 }
      );
    }

    const [{ profile }, dailyData] = await Promise.all([
      getOrCreateNutritionProfile(user.id),
      getDailyNutritionData(user.id, dateKey ?? undefined),
    ]);

    return NextResponse.json({
      ok: true,
      date: dailyData.date,
      meals: dailyData.meals,
      summary: getNutritionDailySummary({
        profile,
        meals: dailyData.meals,
      }),
    });
  } catch (error) {
    console.error("Nutrition meals GET error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile recuperare i pasti del giorno." },
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
      mealType?: unknown;
      name?: unknown;
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

    const rawDate =
      body.date === undefined || body.date === null || body.date === ""
        ? null
        : parseRequiredString(body.date);
    const mealInput = validateMealInput(body);

    if (!mealInput.ok) {
      return NextResponse.json(
        { ok: false, message: mealInput.message },
        { status: 400 }
      );
    }

    if (rawDate && !isValidDateKey(rawDate)) {
      return NextResponse.json(
        { ok: false, message: "date deve usare il formato YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (rawDate && !getSafeNutritionDate(rawDate)) {
      return NextResponse.json(
        { ok: false, message: "Non puoi salvare pasti in una data futura." },
        { status: 400 }
      );
    }

    const selectedDate = getDateRangeForLocalDay(rawDate ?? getTodayLocalDate());
    const entryDate = new Date(selectedDate.start.getTime() + 12 * 60 * 60 * 1000);

    await prisma.mealEntry.create({
      data: {
        userId: user.id,
        date: entryDate,
        mealType: mealInput.value.mealType,
        name: mealInput.value.name,
        calories: mealInput.value.calories,
        protein: mealInput.value.protein,
        carbs: mealInput.value.carbs,
        fat: mealInput.value.fat,
        notes: mealInput.value.notes,
      },
    });

    revalidatePath("/nutrition");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Nutrition meals POST error", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile salvare il pasto." },
      { status: 500 }
    );
  }
}
