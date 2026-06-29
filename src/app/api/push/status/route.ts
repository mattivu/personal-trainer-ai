import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPushStatus } from "@/lib/push/send-push";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Utente non autenticato." },
        { status: 401 },
      );
    }

    const activeSubscriptions = await prisma.userPushSubscription.count({
      where: {
        userId: user.id,
        revokedAt: null,
      },
    });

    const status = getPushStatus();

    return NextResponse.json({
      ok: true,
      configured: status.configured,
      activeSubscriptions,
      publicKey: status.publicKey,
    });
  } catch (error) {
    console.error("PUSH_STATUS_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Impossibile leggere lo stato push." },
      { status: 500 },
    );
  }
}
