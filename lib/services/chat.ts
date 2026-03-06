import { Prisma } from "@prisma/client";

import { AIParseError, generateChatReply } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db/prisma";
import type { SupportedLanguage } from "@/lib/types/domain";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const toNumber = (value: Prisma.Decimal): number => Number(value);

export const chatWithFinanceAssistant = async (
  userId: string,
  message: string,
  language: SupportedLanguage = "en",
): Promise<string> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * MS_IN_DAY);

  const [transactions, recentInsights] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        amount: true,
        type: true,
        category: true,
      },
    }),
    prisma.insight.findMany({
      where: {
        userId,
        dismissed: false,
      },
      orderBy: {
        generatedAt: "desc",
      },
      take: 5,
      select: {
        message: true,
      },
    }),
  ]);

  const totals = transactions.reduce(
    (acc, tx) => {
      const amount = toNumber(tx.amount);
      if (tx.type === "income") {
        acc.income += amount;
      } else {
        acc.expenses += amount;
      }
      return acc;
    },
    { income: 0, expenses: 0 },
  );

  const categoryTotals = transactions
    .filter((tx) => tx.type === "expense")
    .reduce<Record<string, number>>((acc, tx) => {
      const amount = toNumber(tx.amount);
      acc[tx.category] = (acc[tx.category] ?? 0) + amount;
      return acc;
    }, {});

  const categoryBreakdownMap: Record<string, { category: string; totalExpense: number; totalIncome: number; txCount: number }> = {};
  
  transactions.forEach((tx) => {
    const amount = toNumber(tx.amount);
    if (!categoryBreakdownMap[tx.category]) {
      categoryBreakdownMap[tx.category] = { category: tx.category, totalExpense: 0, totalIncome: 0, txCount: 0 };
    }
    const cat = categoryBreakdownMap[tx.category];
    cat.txCount++;
    if (tx.type === "expense") cat.totalExpense += amount;
    else cat.totalIncome += amount;
  });

  const topCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const context = {
    totals: {
      income: totals.income,
      expenses: totals.expenses,
      netProfit: totals.income - totals.expenses,
    },
    topCategories,
    recentInsights: recentInsights.map((insight) => insight.message),
    transactionCount: transactions.length,
    categoryBreakdown: Object.values(categoryBreakdownMap),
    dateRange: {
      from: thirtyDaysAgo.toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    },
  };

  return generateChatReply(message, language, context);
};

export { AIParseError };

