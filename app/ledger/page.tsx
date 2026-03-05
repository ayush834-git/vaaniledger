"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageSection } from "@/components/ui/PageSection";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import type { TransactionRecord } from "@/lib/types/domain";
import {
  getStoredTransactions,
  refreshStoredTransactionsFromApi,
  removeStoredTransaction,
  subscribeToTransactionCreated,
  subscribeToTransactionsChange,
} from "@/lib/utils/clientTransactions";
import { formatDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const headers = ["Date", "Type", "Category", "Description", "Amount", "Actions"];

export default function LedgerPage() {
  const { t } = useTranslation();
  const { status, isAuthenticated } = useRequireAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTransactions(getStoredTransactions());
    const unsubscribeCreated = subscribeToTransactionCreated((transaction) => {
      setTransactions((previous) => [transaction, ...previous.filter((item) => item.id !== transaction.id)]);
    });
    const unsubscribeChanges = subscribeToTransactionsChange((next) => {
      setTransactions(next);
    });

    void refreshStoredTransactionsFromApi().catch(() => undefined);

    return () => {
      unsubscribeCreated();
      unsubscribeChanges();
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return transactions;
    }

    return transactions.filter((item) =>
      [item.category, item.description ?? "", item.rawInput ?? "", item.type].join(" ").toLowerCase().includes(term),
    );
  }, [searchTerm, transactions]);

  const onDeleteTransaction = async (transactionId: string) => {
    if (deletingId) {
      return;
    }

    setDeletingId(transactionId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, { method: "DELETE" });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error?.message ?? "Failed to delete transaction.");
      }

      removeStoredTransaction(transactionId);
      await refreshStoredTransactionsFromApi();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete transaction.");
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || !isAuthenticated) {
    return <div className="text-sm text-textSecondary">Checking authentication...</div>;
  }

  return (
    <PageSection title={t("ledger.title")} subtitle="Transaction table placeholder">
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Input placeholder={t("ledger.search")} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          <Input placeholder="Category filter" />
          <Input placeholder="Date range filter" />
        </div>
        {errorMessage ? <p className="mb-3 text-sm text-expense">{errorMessage}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-textSecondary">
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-3 py-6 text-center text-textSecondary">
                    {t("ledger.empty")}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="px-3 py-3 text-textSecondary">{formatDateTime(item.createdAt)}</td>
                    <td className={`px-3 py-3 font-medium ${item.type === "income" ? "text-income" : "text-expense"}`}>
                      {item.type}
                    </td>
                    <td className="px-3 py-3 text-textPrimary">{item.category}</td>
                    <td className="px-3 py-3 text-textSecondary">{item.description ?? item.rawInput ?? "-"}</td>
                    <td className={`px-3 py-3 font-mono ${item.type === "income" ? "text-income" : "text-expense"}`}>
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 text-expense"
                        onClick={() => void onDeleteTransaction(item.id)}
                        disabled={deletingId === item.id}
                        aria-label="Delete transaction"
                      >
                        {deletingId === item.id ? "..." : "🗑"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageSection>
  );
}
