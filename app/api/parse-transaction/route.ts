import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { AIParseError, detectIntent, parseTransactionWithAI } from "@/lib/ai/gemini";
import { parseTransactionInputSchema, parsedTransactionSchema, TransactionParseSchema } from "@/lib/ai/schemas";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { chatWithFinanceAssistant } from "@/lib/services/chat";
import { generateInsights } from "@/lib/services/insights";

const parseErrorResponse = (message: string, code = "BAD_REQUEST") => ({
  success: false,
  error: {
    code,
    message,
  },
});

const handleCommand = async ({
  userId,
  input,
}: {
  userId: string;
  input: string;
}): Promise<{
  success: true;
  intent: "command";
  commandResult: {
    action: string;
    status: "completed" | "noop";
    message: string;
    deletedTransactionId?: string;
  };
}> => {
  const normalized = input.toLowerCase();
  const isDeleteLastCommand =
    /(delete|remove|undo)/.test(normalized) && /(last|previous|entry|transaction)/.test(normalized);

  if (!isDeleteLastCommand) {
    return {
      success: true,
      intent: "command",
      commandResult: {
        action: "unsupported",
        status: "noop",
        message: "Command understood but not supported yet.",
      },
    };
  }

  const latestTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!latestTransaction) {
    return {
      success: true,
      intent: "command",
      commandResult: {
        action: "delete_last_transaction",
        status: "noop",
        message: "No transaction found to delete.",
      },
    };
  }

  await prisma.transaction.delete({
    where: { id: latestTransaction.id },
  });

  return {
    success: true,
    intent: "command",
    commandResult: {
      action: "delete_last_transaction",
      status: "completed",
      message: "Last transaction deleted successfully.",
      deletedTransactionId: latestTransaction.id,
    },
  };
};

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
    const intent = await detectIntent(parsed.data.rawInput);

    switch (intent) {
      case "transaction": {
        const aiResult = await parseTransactionWithAI(parsed.data.rawInput, language);
        const validatedAIResult = TransactionParseSchema.safeParse(aiResult);

        if (!validatedAIResult.success) {
          return NextResponse.json(
            parseErrorResponse("Could not understand the transaction.", "AI_VALIDATION_ERROR"),
            { status: 422 },
          );
        }

        const parsedTransaction = parsedTransactionSchema.parse({
          ...validatedAIResult.data,
          rawInput: parsed.data.rawInput,
          inputLanguage: language,
        });

        return NextResponse.json(
          {
            success: true,
            intent,
            parsedTransaction,
          },
          { status: 200 },
        );
      }

      case "chat": {
        const userId = await resolveUserId(language);
        const reply = await chatWithFinanceAssistant(userId, parsed.data.rawInput, language);
        return NextResponse.json({
          success: true,
          intent,
          reply,
        });
      }

      case "insight": {
        const userId = await resolveUserId(language);
        const insights = await generateInsights(userId);
        return NextResponse.json({
          success: true,
          intent,
          insights,
        });
      }

      case "command": {
        const userId = await resolveUserId(language);
        const commandResponse = await handleCommand({
          userId,
          input: parsed.data.rawInput,
        });
        return NextResponse.json(commandResponse);
      }

      default: {
        const userId = await resolveUserId(language);
        const reply = await chatWithFinanceAssistant(userId, parsed.data.rawInput, language);
        return NextResponse.json({
          success: true,
          intent: "chat",
          reply,
        });
      }
    }
  } catch (error) {
    if (error instanceof AIParseError) {
      const messageByCode: Record<string, string> = {
        AI_RATE_LIMITED: "AI is busy right now. Please try again in a few seconds.",
        INVALID_AI_RESPONSE: "Could not understand the transaction.",
        AI_VALIDATION_ERROR: "Could not understand the transaction.",
      };
      const status = error.code === "AI_RATE_LIMITED" ? 429 : 422;
      const message = messageByCode[error.code] ?? error.message;
      return NextResponse.json(parseErrorResponse(message, error.code), { status });
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
        parseErrorResponse("Database operation failed while processing request.", "DATABASE_ERROR"),
        { status: 500 },
      );
    }

    return NextResponse.json(parseErrorResponse("Failed to process transaction request.", "INTERNAL_ERROR"), {
      status: 500,
    });
  }
}
