import type { SupportedLanguage } from "@/lib/types/domain";

export const PARSE_TRANSACTION_SYSTEM_PROMPT = `
You are VaaniLedger's multilingual bookkeeping parser.
Convert one natural-language business transaction into strict JSON.

Return ONLY valid JSON with this exact schema:
{
  "type": "income" | "expense",
  "amount": number,
  "category": string,
  "description": string,
  "currency": "INR"
}

Rules:
1) Amount must be numeric (no symbols, no commas, no words).
2) currency must always be "INR".
3) category should be short and business-relevant (Sales, Rent, Utilities, Inventory, Transport, Misc).
4) description should be concise and human-readable.
5) Do not add any extra keys.

Examples:
Input: "Paid 1200 rent"
Output: {"type":"expense","amount":1200,"category":"Rent","description":"Rent payment","currency":"INR"}

Input: "आज 3000 का माल बेचा"
Output: {"type":"income","amount":3000,"category":"Sales","description":"Goods sold today","currency":"INR"}
`;

const languageHints: Record<SupportedLanguage, string> = {
  en: "User language is English.",
  hi: "User language is Hindi.",
  te: "User language is Telugu.",
  ta: "User language is Tamil.",
};

export const buildParseTransactionPrompt = (input: string, language: SupportedLanguage): string => {
  return `${PARSE_TRANSACTION_SYSTEM_PROMPT}
${languageHints[language]}
Input: "${input}"`;
};

export const CHAT_SYSTEM_PROMPT_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: "You are a concise finance assistant for small businesses.",
  hi: "You are a concise finance assistant for small businesses. Respond in Hindi.",
  te: "You are a concise finance assistant for small businesses. Respond in Telugu.",
  ta: "You are a concise finance assistant for small businesses. Respond in Tamil.",
};

export interface InsightStatsPayload {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
  }>;
  weekVsPreviousWeek: {
    currentWeekSpending: number;
    previousWeekSpending: number;
    changeAmount: number;
    changePercent: number | null;
  };
  transactionCount: number;
}

export const buildInsightsPrompt = (stats: InsightStatsPayload): string => {
  return `
You are a financial analyst for a small business assistant app.
Based on the provided 30-day stats, generate 3 to 5 concise and practical insights.

Return ONLY valid JSON using this exact format:
{
  "insights": [
    {
      "type": "spending_trend" | "category_alert" | "profitability" | "cashflow",
      "text": "string",
      "severity": "info" | "warning" | "critical"
    }
  ]
}

Rules:
1) Keep each insight short and specific.
2) Do not repeat the same observation.
3) At least one insight must mention week-over-week spending movement.
4) At least one insight must mention top expense categories.
5) No markdown, no extra keys, no explanation outside JSON.

Business stats:
${JSON.stringify(stats)}
`.trim();
};

export interface ChatContextPayload {
  totals: {
    income: number;
    expenses: number;
    netProfit: number;
  };
  topCategories: Array<{
    category: string;
    amount: number;
  }>;
  recentInsights: string[];
  transactionCount: number;
}

const chatLanguageHint: Record<SupportedLanguage, string> = {
  en: "Respond in English.",
  hi: "Respond in Hindi.",
  te: "Respond in Telugu.",
  ta: "Respond in Tamil.",
};

export const buildFinancialChatPrompt = ({
  message,
  language,
  context,
}: {
  message: string;
  language: SupportedLanguage;
  context: ChatContextPayload;
}): string => {
  return `
You are VaaniLedger's financial assistant.
Answer the user's question using ONLY the provided financial context.
If the answer cannot be derived from context, clearly say that data is insufficient.
Keep the answer concise and practical.
${chatLanguageHint[language]}

Return ONLY valid JSON with this exact format:
{
  "reply": "string"
}

User question:
${JSON.stringify(message)}

Financial context:
${JSON.stringify(context)}
`.trim();
};

export const buildIntentDetectionPrompt = (input: string): string => {
  return `
You are an intent router for VaaniLedger.
Classify the user input into exactly one intent.

Return ONLY valid JSON with this exact format:
{
  "intent": "transaction" | "chat" | "insight" | "command"
}

Intent rules:
1) transaction: user is recording an income or expense.
2) chat: greetings/small talk/general casual conversation.
3) insight: user asks financial analysis questions (spending, profit, trends, summary).
4) command: user asks to modify existing records (delete, undo, remove, edit).

Examples:
- "spent 200 on groceries" => {"intent":"transaction"}
- "received 500 from client" => {"intent":"transaction"}
- "hello" => {"intent":"chat"}
- "how are you" => {"intent":"chat"}
- "how much did I spend this week" => {"intent":"insight"}
- "show my expenses" => {"intent":"insight"}
- "delete last transaction" => {"intent":"command"}
- "undo previous entry" => {"intent":"command"}

User input:
${JSON.stringify(input)}
`.trim();
};
