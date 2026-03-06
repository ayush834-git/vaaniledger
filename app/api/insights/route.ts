import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { resolveUserId } from "@/lib/auth/resolveUserId";
import { AIParseError, generateInsights } from "@/lib/services/insights";

const buildError = (code: string, message: string) => ({
  ok: false,
  error: {
    code,
    message,
  },
});

export async function GET() {
  try {
    const userId = await resolveUserId();

    const insights = await generateInsights(userId);

    return NextResponse.json({
      ok: true,
      insights,
    });
  } catch (error) {
    if (error instanceof AIParseError) {
      return NextResponse.json(buildError(error.code, error.message), { status: 422 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(buildError("INSIGHT_VALIDATION_ERROR", error.issues[0]?.message ?? "Validation error"), {
        status: 422,
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return NextResponse.json(buildError("DATABASE_ERROR", "Failed to save insights."), { status: 500 });
    }

    return NextResponse.json(buildError("INSIGHTS_FAILED", "Failed to generate insights."), { status: 500 });
  }
}

