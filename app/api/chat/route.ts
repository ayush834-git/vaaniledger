import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { chatInputSchema } from "@/lib/ai/schemas";
import { resolveUserId } from "@/lib/auth/resolveUserId";
import { prisma } from "@/lib/db/prisma";
import { AIParseError, chatWithFinanceAssistant } from "@/lib/services/chat";
import type { SupportedLanguage } from "@/lib/types/domain";

const resolveLanguage = (value: string | null | undefined): SupportedLanguage => {
  if (value === "hi" || value === "te" || value === "ta") {
    return value;
  }
  return "en";
};

const buildError = (code: string, message: string) => ({
  ok: false,
  error: { code, message },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = chatInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        buildError("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid payload"),
        { status: 400 },
      );
    }

    const userId = await resolveUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { languagePref: true },
    });

    const language = parsed.data.language ?? resolveLanguage(user?.languagePref);
    const reply = await chatWithFinanceAssistant(userId, parsed.data.message, language);

    return NextResponse.json({
      ok: true,
      reply,
    });
  } catch (error) {
    if (error instanceof AIParseError) {
      const status = error.code === "AI_CONFIG_ERROR" ? 503
                   : error.code === "AI_RATE_LIMITED" ? 429
                   : 422;
      return NextResponse.json(buildError(error.code, error.message), { status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(buildError("VALIDATION_ERROR", error.issues[0]?.message ?? "Validation error"), {
        status: 400,
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return NextResponse.json(buildError("DATABASE_ERROR", "Database query failed while preparing chat context."), {
        status: 500,
      });
    }

    return NextResponse.json(buildError("CHAT_FAILED", "Failed to generate assistant reply."), { status: 500 });
  }
}

