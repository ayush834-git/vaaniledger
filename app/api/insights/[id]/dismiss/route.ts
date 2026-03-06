import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/resolveUserId";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await resolveUserId();

    const result = await prisma.insight.updateMany({
      where: {
        id: params.id,
        userId,
      },
      data: {
        dismissed: true,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ ok: false, error: "Insight not found or access denied." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to dismiss insight." }, { status: 500 });
  }
}
