import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getSummary } from "@/lib/services/analytics";
import type { SummaryResponse, SummaryResponseData } from "@/lib/types/api";

const DEMO_EMAIL = "demo@vaaniledger.local";
const emptySummary: SummaryResponseData = {
  today: { income: 0, expenses: 0, netProfit: 0 },
  week: { income: 0, expenses: 0, netProfit: 0 },
  month: { income: 0, expenses: 0, netProfit: 0 },
  categoryBreakdown: [],
};

export async function GET() {
  try {
    const session = await getServerAuthSession();
    const email = session?.user?.email ?? process.env.DEMO_USER_EMAIL ?? DEMO_EMAIL;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      const emptyPayload: SummaryResponse = {
        ok: true,
        data: emptySummary,
      };
      return NextResponse.json(emptyPayload);
    }

    const summary = await getSummary(user.id);

    const payload: SummaryResponse = {
      ok: true,
      data: summary,
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SUMMARY_FETCH_FAILED",
          message: "Failed to compute summary analytics.",
        },
      },
      { status: 500 },
    );
  }
}
