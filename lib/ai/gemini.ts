import { z } from "zod";

import {
  buildFinancialChatPrompt,
  buildIntentDetectionPrompt,
  buildInsightsPrompt,
  buildParseTransactionPrompt,
  type ChatContextPayload,
  type InsightStatsPayload,
} from "@/lib/ai/prompts";
import { type AIProvider, generateWithGemini, generateWithGroq } from "@/lib/ai/providers";
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

const extractJsonObject = (raw: string): unknown => {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new AIParseError("Model response did not contain a JSON object.", "INVALID_AI_RESPONSE");
  }

  const jsonChunk = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonChunk);
  } catch {
    throw new AIParseError("Unable to parse JSON from model response.", "INVALID_AI_RESPONSE");
  }
};

const intentResponseSchema = z
  .object({
    intent: z.enum(["transaction", "chat", "insight", "command"]),
  })
  .strict();

export const generateJsonFromAI = async (prompt: string, provider: AIProvider = "gemini"): Promise<unknown> => {
  try {
    const modelText = provider === "groq" ? await generateWithGroq(prompt) : await generateWithGemini(prompt);
    return extractJsonObject(modelText);
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
        : "AI_REQUEST_FAILED";

    const message = error instanceof Error ? error.message : "AI request failed. Please try again.";
    throw new AIParseError(message, code);
  }
};

export const detectIntent = async (input: string): Promise<AssistantIntent> => {
  try {
    const prompt = buildIntentDetectionPrompt(input);
    const extractedJson = await generateJsonFromAI(prompt, "gemini");
    const validated = intentResponseSchema.safeParse(extractedJson);

    if (!validated.success) {
      return "chat";
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
  const extractedJson = await generateJsonFromAI(prompt, "gemini");
  const validated = TransactionParseSchema.safeParse(extractedJson);

  if (!validated.success) {
    throw new AIParseError("AI output did not match transaction schema.", "INVALID_AI_RESPONSE");
  }

  return validated.data;
};

export const generateInsightsWithAI = async (
  stats: InsightStatsPayload,
): Promise<z.infer<typeof generatedInsightsResponseSchema>> => {
  const prompt = buildInsightsPrompt(stats);
  const extractedJson = await generateJsonFromAI(prompt, "gemini");
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
  const extractedJson = await generateJsonFromAI(prompt, "gemini");
  const validated = chatAssistantResponseSchema.safeParse(extractedJson);

  if (!validated.success) {
    throw new AIParseError("AI output did not match chat response schema.", "INVALID_AI_RESPONSE");
  }

  return validated.data.reply;
};
