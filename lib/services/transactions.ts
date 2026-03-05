import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { CreateTransactionRequest, Paginated, TransactionsQuery } from "@/lib/types/api";
import type { SupportedLanguage, TransactionRecord } from "@/lib/types/domain";

const parseDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const toSupportedLanguage = (value: string | null): SupportedLanguage | null => {
  if (value === "en" || value === "hi" || value === "te" || value === "ta") {
    return value;
  }
  return null;
};

const mapTransactionRecord = (input: {
  id: string;
  userId: string;
  amount: Prisma.Decimal;
  type: "income" | "expense";
  category: string;
  description: string | null;
  rawInput: string | null;
  inputLanguage: string | null;
  createdAt: Date;
}): TransactionRecord => {
  return {
    id: input.id,
    userId: input.userId,
    amount: Number(input.amount),
    type: input.type,
    category: input.category,
    description: input.description,
    rawInput: input.rawInput,
    inputLanguage: toSupportedLanguage(input.inputLanguage),
    createdAt: input.createdAt.toISOString(),
  };
};

export const getTransactions = async (
  userId: string,
  filters: TransactionsQuery,
): Promise<Paginated<TransactionRecord>> => {
  const page = Math.max(filters.page ?? 1, 1);
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const from = parseDate(filters.from);
  const to = parseDate(filters.to);

  const where: Prisma.TransactionWhereInput = {
    userId,
  };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.category) {
    where.category = {
      contains: filters.category,
      mode: "insensitive",
    };
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (filters.search) {
    where.OR = [
      {
        description: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        rawInput: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        category: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        userId: true,
        amount: true,
        type: true,
        category: true,
        description: true,
        rawInput: true,
        inputLanguage: true,
        createdAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    items: items.map(mapTransactionRecord),
    pagination: {
      page,
      limit,
      total,
    },
  };
};

export const createTransaction = async (
  userId: string,
  transactionData: CreateTransactionRequest,
): Promise<TransactionRecord> => {
  const created = await prisma.transaction.create({
    data: {
      userId,
      amount: new Prisma.Decimal(transactionData.amount),
      type: transactionData.type,
      category: transactionData.category,
      description: transactionData.description ?? null,
      rawInput: transactionData.rawInput ?? null,
      inputLanguage: transactionData.inputLanguage ?? null,
    },
    select: {
      id: true,
      userId: true,
      amount: true,
      type: true,
      category: true,
      description: true,
      rawInput: true,
      inputLanguage: true,
      createdAt: true,
    },
  });

  return mapTransactionRecord(created);
};

export const deleteTransaction = async (transactionId: string): Promise<boolean> => {
  const result = await prisma.transaction.deleteMany({
    where: {
      id: transactionId,
    },
  });

  return result.count > 0;
};

