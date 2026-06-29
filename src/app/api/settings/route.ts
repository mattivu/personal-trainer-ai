import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  getOrCreateUserSettings,
  updateUserSettings,
} from "@/lib/settings/user-settings";
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
        { status: 401 },
      );
    }

    const settings = await getOrCreateUserSettings(user.id);

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    console.error("SETTINGS_GET_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile recuperare le impostazioni." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch (error) {
      if (isJsonSyntaxError(error)) {
        return NextResponse.json(
          {
            ok: false,
            message: "Dati non validi. Controlla le impostazioni e riprova.",
          },
          { status: 400 },
        );
      }

      throw error;
    }

    const result = await updateUserSettings(user.id, body);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 400 },
      );
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
      settings: result.value,
    });
  } catch (error) {
    console.error("SETTINGS_PATCH_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile salvare le impostazioni." },
      { status: 500 },
    );
  }
}
