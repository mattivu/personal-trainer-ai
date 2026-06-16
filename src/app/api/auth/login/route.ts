import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !isValidEmail(email) || !password) {
      return NextResponse.json(
        { ok: false, message: "Email o password non validi." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        onboardingStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Email o password non corretti." },
        { status: 401 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json(
        { ok: false, message: "Email o password non corretti." },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      message: "Login effettuato correttamente.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingStatus: user.onboardingStatus,
      },
    });
  } catch (error) {
    console.error("LOGIN_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante il login." },
      { status: 500 }
    );
  }
}
