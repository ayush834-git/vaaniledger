import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { resolveUserId } from "@/lib/auth/resolveUserId";
import { AIParseError, generateInsights } from "@/lib/services/insights";

import { prisma } from "@/lib/db/prisma";

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

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    
    // Check if we have insights in the last 6 hours
    const recentInsights = await prisma.insight.findMany({
      where: {
        userId,
        generatedAt: {
          gte: sixHoursAgo,
        },
      },
      orderBy: { generatedAt: 'desc' },
    });

    let insights;

    if (recentInsights.length > 0) {
      // Use cached
      insights = recentInsights.map(r => ({ ...r, generatedAt: r.generatedAt.toISOString() }));
    } else {
      // Generate new insights
      insights = await generateInsights(userId);
    }

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

