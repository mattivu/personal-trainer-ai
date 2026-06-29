import { NextResponse } from "next/server";
import {
  revokeUserPushSubscription,
  saveUserPushSubscription,
} from "@/lib/push/push-subscriptions";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError;
}

export async function POST(request: Request) {
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
          { ok: false, message: "Subscription push non valida." },
          { status: 400 },
        );
      }

      throw error;
    }

    const result = await saveUserPushSubscription(user.id, body, {
      userAgent: request.headers.get("user-agent"),
      platform: request.headers.get("sec-ch-ua-platform"),
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUSH_SUBSCRIBE_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile salvare il dispositivo push." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 },
      );
    }

    let endpoint: string | null = null;

    try {
      const body = (await request.json()) as { endpoint?: unknown };
      endpoint = typeof body.endpoint === "string" ? body.endpoint : null;
    } catch (error) {
      if (!isJsonSyntaxError(error)) {
        throw error;
      }
    }

    const result = await revokeUserPushSubscription(user.id, endpoint);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUSH_UNSUBSCRIBE_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile disattivare il dispositivo push." },
      { status: 500 },
    );
  }
}
