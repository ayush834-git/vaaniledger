import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { createTransaction, getTransactions } from "@/lib/services/transactions";
import type {
  CreateTransactionResponse,
  TransactionsListResponse,
  TransactionsQuery,
} from "@/lib/types/api";

const querySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  description: z.string().optional(),
  rawInput: z.string().optional(),
  inputLanguage: z.enum(["en", "hi", "te", "ta"]).optional(),
});

import { resolveUserId } from "@/lib/auth/resolveUserId";

export async function GET(request: NextRequest) {
  try {
    const entries = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(entries);

    if (!parsed.success) {
      const errorPayload: TransactionsListResponse = {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "Invalid query parameters",
        },
      };
      return NextResponse.json(errorPayload, { status: 400 });
    }

    const query: TransactionsQuery = parsed.data;
    const userId = await resolveUserId();
    const data = await getTransactions(userId, query);

    const payload: TransactionsListResponse = {
      ok: true,
      data,
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      const errorPayload: TransactionsListResponse = {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to fetch transactions.",
        },
      };
      return NextResponse.json(errorPayload, { status: 500 });
    }

    const errorPayload: TransactionsListResponse = {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch transactions.",
      },
    };
    return NextResponse.json(errorPayload, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      const errorPayload: CreateTransactionResponse = {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "Invalid transaction payload",
        },
      };
      return NextResponse.json(errorPayload, { status: 400 });
    }

    const userId = await resolveUserId();
    const transaction = await createTransaction(userId, parsed.data);

    const payload: CreateTransactionResponse = {
      ok: true,
      data: transaction,
    };

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      const errorPayload: CreateTransactionResponse = {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to create transaction.",
        },
      };
      return NextResponse.json(errorPayload, { status: 500 });
    }

    const errorPayload: CreateTransactionResponse = {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create transaction.",
      },
    };
    return NextResponse.json(errorPayload, { status: 500 });
  }
}
