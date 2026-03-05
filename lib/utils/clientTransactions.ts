import type { TransactionRecord } from "@/lib/types/domain";

const STORAGE_KEY = "vaaniledger.transactions";
const CREATED_EVENT = "vaaniledger:transaction-created";
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

export const addStoredTransaction = (transaction: TransactionRecord) => {
  const existing = getStoredTransactions();
  const deduped = existing.filter((item) => item.id !== transaction.id);
  const next = [transaction, ...deduped];
  saveStoredTransactions(next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<{ transaction: TransactionRecord }>(CREATED_EVENT, {
        detail: { transaction },
      }),
    );
  }
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

