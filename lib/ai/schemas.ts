import { z } from "zod";

export const parseTransactionInputSchema = z.object({
  rawInput: z.string().min(1, "rawInput is required"),
  language: z.enum(["en", "hi", "te", "ta"]).optional(),
});

export const TransactionParseSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z.number().positive(),
    category: z.string().min(1),
    description: z.string().min(1),
    currency: z.literal("INR"),
  })
  .strict();

export const parsedTransactionSchema = TransactionParseSchema.extend({
  rawInput: z.string().min(1),
  inputLanguage: z.enum(["en", "hi", "te", "ta"]),
}).strict();

export const savedTransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amount: z.number().nonnegative(),
  category: z.string().min(1),
  description: z.string().nullable(),
  rawInput: z.string().nullable(),
  inputLanguage: z.enum(["en", "hi", "te", "ta"]).nullable(),
  createdAt: z.string().datetime(),
});

export const chatInputSchema = z.object({
  message: z.string().min(1, "message is required"),
  language: z.enum(["en", "hi", "te", "ta"]).optional(),
});

export const chatAssistantResponseSchema = z
  .object({
    reply: z.string().min(1),
  })
  .strict();

export const generatedInsightSchema = z
  .object({
    type: z.enum(["spending_trend", "category_alert", "profitability", "cashflow"]),
    text: z.string().min(1),
    severity: z.enum(["info", "warning", "critical"]),
  })
  .strict();

export const generatedInsightsResponseSchema = z
  .object({
    insights: z.array(generatedInsightSchema).min(3).max(5),
  })
  .strict();
