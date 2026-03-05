import type { TransactionRecord } from "@/lib/types/domain";

const STORAGE_KEY = "vaaniledger.transactions";
const CREATED_EVENT = "vaaniledger:transaction-created";
const CHANGED_EVENT = "vaaniledger:transactions-changed";
const MAX_STORED_TRANSACTIONS = 200;

export const getStoredTransactions = (): TransactionRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as TransactionRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

const saveStoredTransactions = (transactions: TransactionRecord[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions.slice(0, MAX_STORED_TRANSACTIONS)));
};

const emitTransactionsChanged = (transactions: TransactionRecord[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<{ transactions: TransactionRecord[] }>(CHANGED_EVENT, {
      detail: { transactions },
    }),
  );
};

export const setStoredTransactions = (transactions: TransactionRecord[]) => {
  const deduped = transactions.filter(
    (transaction, index, source) => source.findIndex((candidate) => candidate.id === transaction.id) === index,
  );
  saveStoredTransactions(deduped);
  emitTransactionsChanged(deduped);
};

export const addStoredTransaction = (transaction: TransactionRecord) => {
  const existing = getStoredTransactions();
  const deduped = existing.filter((item) => item.id !== transaction.id);
  const next = [transaction, ...deduped];
  setStoredTransactions(next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<{ transaction: TransactionRecord }>(CREATED_EVENT, {
        detail: { transaction },
      }),
    );
  }
};

export const removeStoredTransaction = (transactionId: string) => {
  const existing = getStoredTransactions();
  const next = existing.filter((item) => item.id !== transactionId);
  setStoredTransactions(next);
};

export const subscribeToTransactionsChange = (callback: (transactions: TransactionRecord[]) => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ transactions: TransactionRecord[] }>).detail;
    if (Array.isArray(detail?.transactions)) {
      callback(detail.transactions);
    }
  };

  window.addEventListener(CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener(CHANGED_EVENT, handler);
  };
};

export const refreshStoredTransactionsFromApi = async (): Promise<TransactionRecord[]> => {
  const response = await fetch("/api/transactions?page=1&limit=200", { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to fetch transactions.");
  }

  const payload = (await response.json()) as {
    ok?: boolean;
    data?: {
      items?: TransactionRecord[];
    };
    error?: {
      message?: string;
    };
  };

  if (!payload.ok || !Array.isArray(payload.data?.items)) {
    throw new Error(payload.error?.message ?? "Invalid transactions payload.");
  }

  setStoredTransactions(payload.data.items);
  return payload.data.items;
};

export const subscribeToTransactionCreated = (callback: (transaction: TransactionRecord) => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ transaction: TransactionRecord }>).detail;
    if (detail?.transaction) {
      callback(detail.transaction);
    }
  };

  window.addEventListener(CREATED_EVENT, handler);
  return () => {
    window.removeEventListener(CREATED_EVENT, handler);
  };
};
