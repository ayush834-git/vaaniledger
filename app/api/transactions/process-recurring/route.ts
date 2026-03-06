import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    
    const dueTransactions = await prisma.transaction.findMany({
      where: {
        nextDueAt: { lte: now },
        recurrence: { not: "NONE" },
      },
    });

    let processed = 0;

    for (const parent of dueTransactions) {
      if (!parent.nextDueAt) continue;

      let nextDueAt: Date | null = null;
      const nextDate = new Date(parent.nextDueAt);
      
      if (parent.recurrence === "DAILY") {
        nextDate.setDate(nextDate.getDate() + 1);
        nextDueAt = nextDate;
      } else if (parent.recurrence === "WEEKLY") {
        nextDate.setDate(nextDate.getDate() + 7);
        nextDueAt = nextDate;
      } else if (parent.recurrence === "MONTHLY") {
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDueAt = nextDate;
      }

      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: parent.id },
          data: { recurrence: "NONE", nextDueAt: null },
        }),
        prisma.transaction.create({
          data: {
            userId: parent.userId,
            amount: parent.amount,
            type: parent.type,
            category: parent.category,
            description: parent.description,
            inputLanguage: parent.inputLanguage,
            rawInput: parent.rawInput,
            recurrence: parent.recurrence,
            nextDueAt: nextDueAt,
          },
        }),
      ]);
      
      processed++;
    }

    return NextResponse.json({ processed });
  } catch (error) {
    console.error("Error processing recurring transactions:", error);
    return NextResponse.json({ error: "Failed to process recurring transactions." }, { status: 500 });
  }
}
