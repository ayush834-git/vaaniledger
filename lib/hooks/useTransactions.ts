"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError, ApiResponse, CreateTransactionRequest } from "@/lib/types/api";
import type { TransactionRecord } from "@/lib/types/domain";
import {
  addStoredTransaction,
  getStoredTransactions,
  refreshStoredTransactionsFromApi,
  removeStoredTransaction,
  subscribeToTransactionsChange,
} from "@/lib/utils/clientTransactions";
import { toUserFacingError } from "@/lib/utils/errorMessages";

interface UseTransactionsResult {
  transactions: TransactionRecord[];
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  refreshTransactions: () => Promise<TransactionRecord[]>;
  createTransactionRecord: (input: CreateTransactionRequest) => Promise<TransactionRecord>;
  deleteTransactionRecord: (transactionId: string) => Promise<void>;
  clearError: () => void;
}

const parseJsonSafe = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const resolveError = (error: ApiError | null | undefined, fallback: string) =>
  toUserFacingError(error, { fallback });

export const useTransactions = (): UseTransactionsResult => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshTransactions = useCallback(async (): Promise<TransactionRecord[]> => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const items = await refreshStoredTransactionsFromApi();
      setTransactions(items);
      return items;
    } catch {
      const message = "Failed to refresh transactions.";
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const createTransactionRecord = useCallback(
    async (input: CreateTransactionRequest): Promise<TransactionRecord> => {
      setErrorMessage(null);

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const payload = await parseJsonSafe<ApiResponse<TransactionRecord>>(response);
      if (!response.ok || !payload || !payload.ok) {
        const message = resolveError(
          payload && !payload.ok ? payload.error : undefined,
          "Failed to save transaction.",
        );
        setErrorMessage(message);
        throw new Error(message);
      }

      addStoredTransaction(payload.data);
      await refreshTransactions();
      return payload.data;
    },
    [refreshTransactions],
  );

  const deleteTransactionRecord = useCallback(
    async (transactionId: string): Promise<void> => {
      setErrorMessage(null);

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      const payload = await parseJsonSafe<ApiResponse<{ deleted: boolean }>>(response);
      if (!response.ok || !payload || !payload.ok) {
        const message = resolveError(
          payload && !payload.ok ? payload.error : undefined,
          "Failed to delete transaction.",
        );
        setErrorMessage(message);
        throw new Error(message);
      }

      removeStoredTransaction(transactionId);
      await refreshTransactions();
    },
    [refreshTransactions],
  );

  useEffect(() => {
    setTransactions(getStoredTransactions());

    const unsubscribe = subscribeToTransactionsChange((next) => {
      setTransactions(next);
    });

    void refreshTransactions().finally(() => {
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [refreshTransactions]);

  return {
    transactions,
    isLoading,
    isRefreshing,
    errorMessage,
    refreshTransactions,
    createTransactionRecord,
    deleteTransactionRecord,
    clearError: () => setErrorMessage(null),
  };
};
