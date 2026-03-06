import type {
  InsightRecord,
  ParsedTransactionDraft,
  SupportedLanguage,
  TransactionRecord,
  TransactionType,
  BudgetGoalRecord,
} from "@/lib/types/domain";

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ParseTransactionRequest {
  rawInput: string;
  language?: SupportedLanguage;
}

export type ParseTransactionResponse = ApiResponse<ParsedTransactionDraft>;

export interface ChatRequest {
  message: string;
  language?: SupportedLanguage;
}

export interface ChatReply {
  reply: string;
}

export type ChatResponse = ApiResponse<ChatReply>;

export interface SummaryResponseData {
  today: {
    income: number;
    expenses: number;
    netProfit: number;
  };
  week: {
    income: number;
    expenses: number;
    netProfit: number;
  };
  month: {
    income: number;
    expenses: number;
    netProfit: number;
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
  }>;
}

export type SummaryResponse = ApiResponse<SummaryResponseData>;

export interface TransactionsQuery {
  type?: TransactionType;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionRequest {
  amount: number;
  type: TransactionType;
  category: string;
  description?: string;
  rawInput?: string;
  inputLanguage?: SupportedLanguage;
  recurrence?: string;
  nextDueAt?: Date | null;
}

export type TransactionsListResponse = ApiResponse<Paginated<TransactionRecord>>;

export type CreateTransactionResponse = ApiResponse<TransactionRecord>;

export type InsightsResponse = ApiResponse<InsightRecord[]>;

export type GoalsResponse = ApiResponse<BudgetGoalRecord[]>;
export type GoalResponse = ApiResponse<BudgetGoalRecord>;