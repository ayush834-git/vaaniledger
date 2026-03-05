import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { chatInputSchema } from "@/lib/ai/schemas";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AIParseError, chatWithFinanceAssistant } from "@/lib/services/chat";
import type { SupportedLanguage } from "@/lib/types/domain";

const DEMO_EMAIL = "demo@vaaniledger.local";

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

    const session = await getServerAuthSession();
    const email = session?.user?.email ?? process.env.DEMO_USER_EMAIL ?? DEMO_EMAIL;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: session?.user?.name ?? "Demo User",
      },
      update: {
        name: session?.user?.name ?? undefined,
      },
      select: {
        id: true,
        languagePref: true,
      },
    });

    const language = parsed.data.language ?? resolveLanguage(user.languagePref);
    const reply = await chatWithFinanceAssistant(user.id, parsed.data.message, language);

    return NextResponse.json({
      ok: true,
      reply,
    });
  } catch (error) {
    if (error instanceof AIParseError) {
      return NextResponse.json(buildError(error.code, error.message), { status: 422 });
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

