export type SupportedLanguage = "en" | "hi" | "te" | "ta";

export type TransactionType = "income" | "expense";

export interface ParsedTransactionDraft {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  rawInput: string;
  inputLanguage: SupportedLanguage;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string | null;
  rawInput: string | null;
  inputLanguage: SupportedLanguage | null;
  recurrence: string;
  nextDueAt: string | null;
  createdAt: string;
}

export interface InsightRecord {
  id: string;
  userId: string;
  type: string;
  message: string;
  dismissed: boolean;
  generatedAt: string;
}

export interface BudgetGoalRecord {
  id: string;
  userId: string;
  category: string;
  amount: number;
  period: string;
}