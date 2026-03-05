import { Prisma, TransactionType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { SummaryResponseData } from "@/lib/types/api";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const toNumber = (value: Prisma.Decimal | null | undefined): number => Number(value ?? 0);

const startOfDay = (input: Date): Date => {
  const next = new Date(input);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfWeek = (input: Date): Date => {
  const dayStart = startOfDay(input);
  const day = dayStart.getDay();
  const mondayOffset = (day + 6) % 7;
  return new Date(dayStart.getTime() - mondayOffset * MS_IN_DAY);
};

const startOfMonth = (input: Date): Date => {
  return new Date(input.getFullYear(), input.getMonth(), 1);
};

const getRangeTotal = async ({
  userId,
  start,
  end,
  type,
}: {
  userId: string;
  start: Date;
  end: Date;
  type: TransactionType;
}): Promise<number> => {
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      type,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return toNumber(result._sum.amount);
};

export const getSummary = async (userId: string): Promise<SummaryResponseData> => {
  const now = new Date();
  const tomorrowStart = new Date(startOfDay(now).getTime() + MS_IN_DAY);
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [todayIncome, todayExpenses, weekIncome, weekExpenses, monthIncome, monthExpenses, categoryRows] =
    await Promise.all([
      getRangeTotal({ userId, start: todayStart, end: tomorrowStart, type: "income" }),
      getRangeTotal({ userId, start: todayStart, end: tomorrowStart, type: "expense" }),
      getRangeTotal({ userId, start: weekStart, end: tomorrowStart, type: "income" }),
      getRangeTotal({ userId, start: weekStart, end: tomorrowStart, type: "expense" }),
      getRangeTotal({ userId, start: monthStart, end: tomorrowStart, type: "income" }),
      getRangeTotal({ userId, start: monthStart, end: tomorrowStart, type: "expense" }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          type: "expense",
          createdAt: {
            gte: monthStart,
            lt: tomorrowStart,
          },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
      }),
    ]);

  return {
    today: {
      income: todayIncome,
      expenses: todayExpenses,
      netProfit: todayIncome - todayExpenses,
    },
    week: {
      income: weekIncome,
      expenses: weekExpenses,
      netProfit: weekIncome - weekExpenses,
    },
    month: {
      income: monthIncome,
      expenses: monthExpenses,
      netProfit: monthIncome - monthExpenses,
    },
    categoryBreakdown: categoryRows.map((row) => ({
      category: row.category,
      amount: toNumber(row._sum.amount),
    })),
  };
};

