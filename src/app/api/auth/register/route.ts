import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name || name.length < 2) {
      return NextResponse.json(
        { ok: false, message: "Inserisci un nome valido." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "Inserisci un indirizzo email valido." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, message: "La password deve contenere almeno 8 caratteri." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { ok: false, message: "Esiste già un account con questa email." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        onboardingStatus: "not_started",
        profile: {
          create: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        onboardingStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Account creato correttamente.",
      user,
    });
  } catch (error) {
    console.error("REGISTER_ERROR", error);

    return NextResponse.json(
      { ok: false, message: "Errore durante la registrazione." },
      { status: 500 }
    );
  }
}
