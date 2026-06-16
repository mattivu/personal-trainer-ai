import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    console.error("ME_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante il recupero utente." },
      { status: 500 }
    );
  }
}
