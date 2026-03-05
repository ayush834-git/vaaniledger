"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { MicButtonPlaceholder } from "@/components/mic/MicButtonPlaceholder";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageSection } from "@/components/ui/PageSection";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import type { TransactionRecord } from "@/lib/types/domain";
import {
  addStoredTransaction,
  getStoredTransactions,
  refreshStoredTransactionsFromApi,
  subscribeToTransactionCreated,
  subscribeToTransactionsChange,
} from "@/lib/utils/clientTransactions";
import { formatDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatCurrency";

type ParseTransactionResponse = {
  success?: boolean;
  intent?: "transaction" | "chat" | "insight" | "command";
  transaction?: TransactionRecord;
  reply?: string;
  insights?: Array<unknown>;
  commandResult?: { message?: string; deletedTransactionId?: string };
  error?: { message?: string };
};

const resolveSupportedLanguage = (input: string) => {
  const base = input.split("-")[0];
  if (base === "hi" || base === "te" || base === "ta") {
    return base;
  }
  return "en";
};

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { status, isAuthenticated } = useRequireAuth();
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMessage, setInputMessage] = useState<string | null>(null);

  const language = useMemo(() => resolveSupportedLanguage(i18n.language), [i18n.language]);

  useEffect(() => {
    setRecentTransactions(getStoredTransactions().slice(0, 5));
    const unsubscribeCreated = subscribeToTransactionCreated((transaction) => {
      setRecentTransactions((previous) => [transaction, ...previous.filter((item) => item.id !== transaction.id)].slice(0, 5));
    });

    const unsubscribeChanges = subscribeToTransactionsChange((transactions) => {
      setRecentTransactions(transactions.slice(0, 5));
    });

    void refreshStoredTransactionsFromApi().catch(() => undefined);

    return () => {
      unsubscribeCreated();
      unsubscribeChanges();
    };
  }, []);

  const onTransactionCreated = (transaction: TransactionRecord) => {
    setRecentTransactions((previous) => [transaction, ...previous.filter((item) => item.id !== transaction.id)].slice(0, 5));
  };

  const submitManualInput = async () => {
    const rawInput = manualInput.trim();
    if (!rawInput || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setInputMessage("Processing...");

    try {
      const response = await fetch("/api/parse-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawInput,
          language,
        }),
      });

      const payload = (await response.json()) as ParseTransactionResponse;

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error?.message ?? "Failed to process input.");
      }

      if ("transaction" in payload && payload.transaction) {
        addStoredTransaction(payload.transaction);
        setManualInput("");
        setInputMessage("Saved");
        return;
      }

      if ("reply" in payload && payload.reply) {
        setInputMessage(payload.reply);
        return;
      }

      if ("insights" in payload && Array.isArray(payload.insights)) {
        setInputMessage(`Generated ${payload.insights.length} insights.`);
        return;
      }

      if ("commandResult" in payload && payload.commandResult?.message) {
        setInputMessage(payload.commandResult.message);
        return;
      }

      setInputMessage("Request completed.");
    } catch (error) {
      setInputMessage(error instanceof Error ? error.message : "Failed to process input.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submitManualInput();
    }
  };

  if (status === "loading" || !isAuthenticated) {
    return <div className="text-sm text-textSecondary">Checking authentication...</div>;
  }

  return (
    <div className="space-y-8">
      <PageSection title={t("app.title")} subtitle={t("app.subtitle")}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">{t("add.transaction")}</h2>
            <div className="space-y-5">
              <MicButtonPlaceholder onTransactionCreated={onTransactionCreated} />
              <label className="block text-sm text-textSecondary" htmlFor="transaction-input">
                {t("home.textInputLabel")}
              </label>
              <div className="flex gap-2">
                <Input
                  id="transaction-input"
                  placeholder={t("home.placeholder")}
                  value={manualInput}
                  onChange={(event) => setManualInput(event.target.value)}
                  onKeyDown={onInputKeyDown}
                />
                <Button type="button" onClick={() => void submitManualInput()} disabled={isSubmitting}>
                  Add Transaction
                </Button>
              </div>
              <p className="text-xs text-textSecondary">Example: spent 200 on groceries</p>
              {inputMessage ? <p className="text-sm text-textSecondary">{inputMessage}</p> : null}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">{t("app.recentTransactions")}</h2>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-textSecondary">No recent transactions yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentTransactions.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-textSecondary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-textPrimary">{item.category}</span>
                      <span className={item.type === "income" ? "text-income" : "text-expense"}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <p className="mt-1">{item.description ?? item.rawInput ?? "-"}</p>
                    <p className="mt-1 text-xs">{formatDateTime(item.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </PageSection>
    </div>
  );
}
