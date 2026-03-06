import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/resolveUserId";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await resolveUserId();
    const id = params.id;

    // Verify ownership
    const goal = await prisma.budgetGoal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Goal not found." } },
        { status: 404 }
      );
    }

    await prisma.budgetGoal.delete({ where: { id } });

    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete goal:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete goal." } },
      { status: 500 }
    );
  }
}
