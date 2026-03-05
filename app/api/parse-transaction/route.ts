import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { AIParseError, parseTransactionWithAI } from "@/lib/ai/gemini";
import { parseTransactionInputSchema, TransactionParseSchema } from "@/lib/ai/schemas";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createTransaction } from "@/lib/services/transactions";

const parseErrorResponse = (message: string, code = "BAD_REQUEST") => ({
  success: false,
  error: {
    code,
    message,
  },
});

const resolveUserId = async (language: "en" | "hi" | "te" | "ta"): Promise<string> => {
  const session = await getServerAuthSession();
  const fallbackEmail = process.env.DEMO_USER_EMAIL ?? "demo@vaaniledger.local";
  const email = session?.user?.email ?? fallbackEmail;

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      languagePref: language,
      name: session?.user?.name ?? "Demo User",
    },
    update: {
      languagePref: language,
      name: session?.user?.name ?? undefined,
    },
    select: {
      id: true,
    },
  });

  return user.id;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseTransactionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(parseErrorResponse(parsed.error.issues[0]?.message ?? "Invalid payload"), {
        status: 400,
      });
    }

    const language = parsed.data.language ?? "en";
    const aiResult = await parseTransactionWithAI(parsed.data.rawInput, language);
    const validatedAIResult = TransactionParseSchema.safeParse(aiResult);

    if (!validatedAIResult.success) {
      return NextResponse.json(
        parseErrorResponse("AI output failed validation.", "AI_VALIDATION_ERROR"),
        { status: 422 },
      );
    }

    const userId = await resolveUserId(language);
    const transaction = await createTransaction(userId, {
      amount: validatedAIResult.data.amount,
      type: validatedAIResult.data.type,
      category: validatedAIResult.data.category,
      description: validatedAIResult.data.description,
      rawInput: parsed.data.rawInput,
      inputLanguage: language,
    });

    return NextResponse.json(
      {
        success: true,
        transaction,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AIParseError) {
      return NextResponse.json(parseErrorResponse(error.message, error.code), { status: 422 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(parseErrorResponse(error.issues[0]?.message ?? "Validation error", "VALIDATION_ERROR"), {
        status: 400,
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return NextResponse.json(
        parseErrorResponse("Database operation failed while saving transaction.", "DATABASE_ERROR"),
        { status: 500 },
      );
    }

    return NextResponse.json(parseErrorResponse("Failed to parse and save transaction.", "INTERNAL_ERROR"), {
      status: 500,
    });
  }
}
