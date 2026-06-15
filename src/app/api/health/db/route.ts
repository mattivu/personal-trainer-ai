import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.appSetting.upsert({
      where: {
        key: "db_connection_test",
      },
      update: {
        value: new Date().toISOString(),
      },
      create: {
        key: "db_connection_test",
        value: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Database connected",
    });
  } catch (error) {
    console.error("DATABASE_HEALTH_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
