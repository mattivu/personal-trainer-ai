import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const setting = await prisma.appSetting.upsert({
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
      setting,
      env: {
        databaseUrlPresent: Boolean(process.env.DATABASE_URL),
        databaseUrlStartsWithMysql: process.env.DATABASE_URL?.startsWith("mysql://") ?? false,
      },
    });
  } catch (error) {
    const err = error as Error & { code?: string; meta?: unknown };

    console.error("DATABASE_HEALTH_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Database connection failed",
        env: {
          databaseUrlPresent: Boolean(process.env.DATABASE_URL),
          databaseUrlStartsWithMysql: process.env.DATABASE_URL?.startsWith("mysql://") ?? false,
        },
        error: {
          name: err.name,
          code: err.code ?? null,
          message: err.message,
          meta: err.meta ?? null,
        },
      },
      { status: 500 }
    );
  }
}
