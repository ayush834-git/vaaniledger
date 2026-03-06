import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { resolveUserId } from "@/lib/auth/resolveUserId";
import { prisma } from "@/lib/db/prisma";
import type { GoalResponse, GoalsResponse } from "@/lib/types/api";

export async function GET() {
  try {
    const userId = await resolveUserId();

    const goals = await prisma.budgetGoal.findMany({
      where: { userId },
      orderBy: { category: "asc" },
    });

    const payload: GoalsResponse = {
      ok: true,
      data: goals,
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch goals." } },
      { status: 500 }
    );
  }
}

const goalSchema = z.object({
  category: z.string().min(1),
  amount: z.number().min(0),
  period: z.string().optional().default("MONTHLY"),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId();
    const body = await req.json();

    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body." } },
        { status: 400 }
      );
    }

    const { category, amount, period } = parsed.data;

    const goal = await prisma.budgetGoal.upsert({
      where: {
        userId_category_period: {
          userId,
          category,
          period,
        },
      },
      update: { amount },
      create: {
        userId,
        category,
        amount,
        period,
      },
    });

    const payload: GoalResponse = {
      ok: true,
      data: goal,
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to upsert goal:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to upsert goal." } },
      { status: 500 }
    );
  }
}
