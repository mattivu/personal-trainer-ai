import { NextResponse } from "next/server";
import { deleteCurrentSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await deleteCurrentSession();

    return NextResponse.json({
      ok: true,
      message: "Logout effettuato correttamente.",
    });
  } catch (error) {
    console.error("LOGOUT_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante il logout." },
      { status: 500 }
    );
  }
}
