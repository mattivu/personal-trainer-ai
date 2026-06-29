import { NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/push/send-push";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 },
      );
    }

    const result = await sendPushToUser(user.id, {
      title: "Promemoria attivo",
      body: "Le notifiche sono configurate correttamente.",
      url: "/dashboard",
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      deliveredCount: result.deliveredCount,
      failedCount: result.failedCount,
    });
  } catch (error) {
    console.error("PUSH_TEST_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile inviare la notifica di prova." },
      { status: 500 },
    );
  }
}
