import { z } from "zod";

import {
  buildFinancialChatPrompt,
  buildInsightsPrompt,
  buildParseTransactionPrompt,
  type ChatContextPayload,
  type InsightStatsPayload,
} from "@/lib/ai/prompts";
import {
  chatAssistantResponseSchema,
  generatedInsightsResponseSchema,
  TransactionParseSchema,
} from "@/lib/ai/schemas";
import type { SupportedLanguage } from "@/lib/types/domain";

class AIParseError extends Error {
  code: string;

  constructor(message: string, code = "AI_PARSE_ERROR") {
    super(message);
    this.code = code;
    this.name = "AIParseError";
  }
}

const GEMINI_MODEL = "gemini-1.5-flash";

const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

const getGeminiApiKey = (): string => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIParseError("GEMINI_API_KEY is missing.", "AI_CONFIG_ERROR");
  }
  return apiKey;
};

const getTextFromGeminiResponse = (payload: unknown): string => {
  const responseSchema = z.object({
    candidates: z
      .array(
        z.object({
          content: z.object({
            parts: z.array(
              z.object({
                text: z.string().optional(),
              }),
            ),
          }),
        }),
      )
      .optional(),
  });

  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AIParseError("Unexpected Gemini response shape.", "INVALID_AI_RESPONSE");
  }

  const text = parsed.data.candidates?.[0]?.content.parts.map((part) => part.text ?? "").join("\n").trim();
  if (!text) {
    throw new AIParseError("Gemini returned an empty response.", "INVALID_AI_RESPONSE");
  }

  return text;
};

const generateJsonFromGemini = async (prompt: string): Promise<unknown> => {
  const apiKey = getGeminiApiKey();

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    throw new AIParseError(`Gemini API request failed with status ${response.status}.`, "AI_REQUEST_FAILED");
  }

  const responseJson = await response.json();
  const modelText = getTextFromGeminiResponse(responseJson);
  return extractJsonObject(modelText);
};

export const parseTransactionWithAI = async (
  input: string,
  language: SupportedLanguage,
): Promise<z.infer<typeof TransactionParseSchema>> => {
  const prompt = buildParseTransactionPrompt(input, language);
  const extractedJson = await generateJsonFromGemini(prompt);
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
  const extractedJson = await generateJsonFromGemini(prompt);
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
  const extractedJson = await generateJsonFromGemini(prompt);
  const validated = chatAssistantResponseSchema.safeParse(extractedJson);

  if (!validated.success) {
    throw new AIParseError("AI output did not match chat response schema.", "INVALID_AI_RESPONSE");
  }

  return validated.data.reply;
};
