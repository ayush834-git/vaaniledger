import { z } from "zod";

import {
  buildFinancialChatPrompt,
  buildIntentDetectionPrompt,
  buildInsightsPrompt,
  buildParseTransactionPrompt,
  type ChatContextPayload,
  type InsightStatsPayload,
} from "@/lib/ai/prompts";
import { generateJsonFromAI } from "@/lib/ai/providers";
import {
  chatAssistantResponseSchema,
  generatedInsightsResponseSchema,
  TransactionParseSchema,
} from "@/lib/ai/schemas";
import type { SupportedLanguage } from "@/lib/types/domain";

export type AssistantIntent = "transaction" | "chat" | "insight" | "command";

class AIParseError extends Error {
  code: string;

  constructor(message: string, code = "AI_PARSE_ERROR") {
    super(message);
    this.code = code;
    this.name = "AIParseError";
  }
}

const intentResponseSchema = z
  .object({
    intent: z.enum(["transaction", "chat", "insight", "command"]),
    confidence: z.number().min(0).max(1),
  })
  .strict();

const requestJsonFromAI = async (prompt: string): Promise<unknown> => {
  try {
    return await generateJsonFromAI(prompt);
  } catch (error) {
    if (error instanceof AIParseError) {
      throw error;
    }

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : "AI_SERVICE_UNAVAILABLE";

    const message = error instanceof Error ? error.message : "AI service temporarily unavailable.";
    throw new AIParseError(message, code);
  }
};

export const detectIntent = async (input: string): Promise<AssistantIntent> => {
  try {
    if (/\d+/.test(input) && !input.trim().endsWith("?")) {
      return "transaction";
    }

    const prompt = buildIntentDetectionPrompt(input);
    const extractedJson = await requestJsonFromAI(prompt);
    const validated = intentResponseSchema.safeParse(extractedJson);

    if (!validated.success) {
      return "chat";
    }

    if (validated.data.confidence < 0.70) {
      return "transaction";
    }

    return validated.data.intent;
  } catch {
    return "chat";
  }
};

export const parseTransactionWithAI = async (
  input: string,
  language: SupportedLanguage,
): Promise<z.infer<typeof TransactionParseSchema>> => {
  const prompt = buildParseTransactionPrompt(input, language);
  const extractedJson = await requestJsonFromAI(prompt);
  const validated = TransactionParseSchema.safeParse(extractedJson);

  if (!validated.success) {
    throw new AIParseError("AI output did not match transaction schema.", "INVALID_AI_RESPONSE");
  }

  return validated.data;
};

export const normalizeTranscript = async (input: string): Promise<string> => {
  const prompt = `You are correcting speech recognition errors.

The input may contain phonetic mistakes.

Correct the sentence into clear natural English describing a financial transaction.

Examples:

ice paint 200 groceries
→ I spent 200 on groceries

sell 500 good
→ I sold goods worth 500

Return ONLY the corrected sentence.

Input:
${JSON.stringify(input)}`;

  const normalized = await requestJsonFromAI(`
Return ONLY valid JSON:
{
  "text": "corrected sentence"
}

${prompt}
`);

  const schema = z
    .object({
      text: z.string().min(1),
    })
    .strict();

  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    return input;
  }

  return parsed.data.text.trim() || input;
};

export const generateInsightsWithAI = async (
  stats: InsightStatsPayload,
): Promise<z.infer<typeof generatedInsightsResponseSchema>> => {
  const prompt = buildInsightsPrompt(stats);
  const extractedJson = await requestJsonFromAI(prompt);
  const validated = generatedInsightsResponseSchema.safeParse(extractedJson);

  if (!validated.success) {
    throw new AIParseError("AI output did not match insights schema.", "INVALID_AI_RESPONSE");
  }

  return validated.data;
};

export { AIParseError };

export const generateChatReply = async (
  message: string,
  language: SupportedLanguage,
  context: ChatContextPayload,
): Promise<string> => {
  const prompt = buildFinancialChatPrompt({ message, language, context });
  const extractedJson = await requestJsonFromAI(prompt);
  const validated = chatAssistantResponseSchema.safeParse(extractedJson);

  if (!validated.success) {
    throw new AIParseError("AI output did not match chat response schema.", "INVALID_AI_RESPONSE");
  }

  return validated.data.reply;
};
