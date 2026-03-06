import { Prisma } from "@prisma/client";
import { z } from "zod";

import { AIParseError, generateInsightsWithAI } from "@/lib/ai/gemini";
import { generatedInsightsResponseSchema } from "@/lib/ai/schemas";
import { prisma } from "@/lib/db/prisma";
import type { InsightRecord } from "@/lib/types/domain";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const toNumber = (value: Prisma.Decimal): number => Number(value);

const mapInsightRecord = (input: {
  id: string;
  userId: string;
  type: string;
  message: string;
  dismissed: boolean;
  generatedAt: Date;
}): InsightRecord => {
  return {
    id: input.id,
    userId: input.userId,
    type: input.type,
    message: input.message,
    dismissed: input.dismissed,
    generatedAt: input.generatedAt.toISOString(),
  };
};

export const generateInsights = async (userId: string): Promise<InsightRecord[]> => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_IN_DAY);
  const currentWeekStart = new Date(now.getTime() - 7 * MS_IN_DAY);
  const previousWeekStart = new Date(now.getTime() - 14 * MS_IN_DAY);

  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: {
        gte: thirtyDaysAgo,
        lte: now,
      },
    },
    select: {
      amount: true,
      type: true,
      category: true,
      createdAt: true,
    },
  });

  const totalIncome = recentTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

  const totalExpenses = recentTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

  const expenseByCategory = recentTransactions
    .filter((tx) => tx.type === "expense")
    .reduce<Record<string, number>>((acc, tx) => {
      const amount = toNumber(tx.amount);
      acc[tx.category] = (acc[tx.category] ?? 0) + amount;
      return acc;
    }, {});

  const topExpenseCategories = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const currentWeekSpending = recentTransactions
    .filter((tx) => tx.type === "expense" && new Date(tx.createdAt).getTime() >= currentWeekStart.getTime())
    .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

  const previousWeekSpending = recentTransactions
    .filter((tx) => tx.type === "expense" && new Date(tx.createdAt).getTime() >= previousWeekStart.getTime() && new Date(tx.createdAt).getTime() < currentWeekStart.getTime())
    .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

  const weekChangeAmount = currentWeekSpending - previousWeekSpending;
  const weekChangePercent =
    previousWeekSpending > 0 ? Number(((weekChangeAmount / previousWeekSpending) * 100).toFixed(2)) : null;

  const stats = {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    topExpenseCategories,
    weekVsPreviousWeek: {
      currentWeekSpending,
      previousWeekSpending,
      changeAmount: weekChangeAmount,
      changePercent: weekChangePercent,
    },
    transactionCount: recentTransactions.length,
  };

  const aiInsights = await generateInsightsWithAI(stats);
  const validatedInsights = generatedInsightsResponseSchema.safeParse(aiInsights);

  if (!validatedInsights.success) {
    throw new z.ZodError(validatedInsights.error.issues);
  }

  const saved = await prisma.$transaction(
    validatedInsights.data.insights.map((item) =>
      prisma.insight.create({
        data: {
          userId,
          message: item.text,
          type: item.type === "spending_trend" ? "SPENDING_SPIKE" 
              : item.type === "profitability" ? "CASHFLOW" 
              : item.type === "category_alert" ? "TOP_CATEGORY" 
              : "CASHFLOW",
        },
        select: {
          id: true,
          userId: true,
          type: true,
          message: true,
          dismissed: true,
          generatedAt: true,
        },
      }),
    ),
  );

  return saved.map(mapInsightRecord);
};

export { AIParseError };

