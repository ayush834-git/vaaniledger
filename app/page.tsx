"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { MicButtonPlaceholder } from "@/components/mic/MicButtonPlaceholder";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageSection } from "@/components/ui/PageSection";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useTransactions } from "@/lib/hooks/useTransactions";
import type { ParsedTransactionDraft } from "@/lib/types/domain";
import { formatDateTime } from "@/lib/utils/date";
import { toUserFacingError } from "@/lib/utils/errorMessages";
import { formatCurrency } from "@/lib/utils/formatCurrency";

type ParseTransactionResponse = {
  success?: boolean;
  intent?: "transaction" | "chat" | "insight" | "command";
  parsedTransaction?: ParsedTransactionDraft;
  reply?: string;
  insights?: Array<unknown>;
  commandResult?: { message?: string; deletedTransactionId?: string };
  error?: { code?: string; message?: string };
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
  const { transactions, createTransactionRecord, refreshTransactions } = useTransactions();
  const [manualInput, setManualInput] = useState("");
  const [pendingTransaction, setPendingTransaction] = useState<ParsedTransactionDraft | null>(null);
  const [pendingSource, setPendingSource] = useState<"text" | "mic" | null>(null);
  const [micSavedSignal, setMicSavedSignal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingConfirmed, setIsSavingConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const language = useMemo(() => resolveSupportedLanguage(i18n.language), [i18n.language]);
  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  const submitManualInput = async () => {
    const rawInput = manualInput.trim();
    if (!rawInput || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Processing...");
    setErrorMessage(null);

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
        throw new Error(
          toUserFacingError(payload.error, {
            fallback: "Could not process your input.",
          }),
        );
      }

      if (payload.intent === "transaction" && payload.parsedTransaction) {
        setPendingTransaction(payload.parsedTransaction);
        setPendingSource("text");
        setStatusMessage("Review the parsed transaction and confirm to save.");
        setErrorMessage(null);
        return;
      }

      if (payload.reply) {
        setPendingTransaction(null);
        setPendingSource(null);
        setStatusMessage(payload.reply);
        return;
      }

      if (Array.isArray(payload.insights)) {
        setPendingTransaction(null);
        setPendingSource(null);
        setStatusMessage(`Generated ${payload.insights.length} insights.`);
        return;
      }

      if (payload.commandResult?.message) {
        setPendingTransaction(null);
        setPendingSource(null);
        if (payload.commandResult.deletedTransactionId) {
          await refreshTransactions().catch(() => undefined);
        }
        setStatusMessage(payload.commandResult.message);
        return;
      }

      setStatusMessage("Request completed.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not process your input.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitManualInput();
    }
  };

  const onConfirmParsedTransaction = async () => {
    if (!pendingTransaction || isSavingConfirmed) {
      return;
    }

    setIsSavingConfirmed(true);
    setErrorMessage(null);
    setStatusMessage("Processing...");

    try {
      await createTransactionRecord({
        amount: pendingTransaction.amount,
        type: pendingTransaction.type,
        category: pendingTransaction.category,
        description: pendingTransaction.description,
        rawInput: pendingTransaction.rawInput,
        inputLanguage: pendingTransaction.inputLanguage,
      });
      setPendingTransaction(null);
      if (pendingSource === "mic") {
        setMicSavedSignal((previous) => previous + 1);
      }
      setPendingSource(null);
      setManualInput("");
      setStatusMessage("Saved");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save transaction.");
    } finally {
      setIsSavingConfirmed(false);
    }
  };

  const onEditParsedTransaction = () => {
    if (!pendingTransaction) {
      return;
    }
    setManualInput(pendingTransaction.rawInput);
    setPendingTransaction(null);
    setPendingSource(null);
    setStatusMessage("Edit your text and submit again.");
  };

  const onCancelParsedTransaction = () => {
    setPendingTransaction(null);
    setPendingSource(null);
    setStatusMessage("Transaction cancelled.");
  };

  const onMicParsedTransaction = (transaction: ParsedTransactionDraft) => {
    setPendingTransaction(transaction);
    setPendingSource("mic");
    setErrorMessage(null);
    setStatusMessage("Review the parsed transaction and confirm to save.");
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
              <MicButtonPlaceholder onTransactionParsed={onMicParsedTransaction} savedSignal={micSavedSignal} />
              <label className="block text-sm text-textSecondary" htmlFor="transaction-input">
                {t("home.textInputLabel")}
              </label>
              <div className="flex gap-2">
                <textarea
                  id="transaction-input"
                  placeholder={t("home.placeholder")}
                  value={manualInput}
                  onChange={(event) => setManualInput(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-white/10 bg-bg/60 px-3 py-2 text-sm text-textPrimary outline-none transition placeholder:text-textSecondary focus:border-accent"
                />
                <Button type="button" onClick={() => void submitManualInput()} disabled={isSubmitting}>
                  Add Transaction
                </Button>
              </div>
              <p className="text-xs text-textSecondary">Example: spent 200 on groceries</p>

              {pendingTransaction ? (
                <Card className="border border-accent/30 bg-accent/5 p-4">
                  <p className="text-sm font-semibold text-accent">Confirm Transaction</p>
                  <div className="mt-3 grid gap-2 text-sm text-textSecondary">
                    <p>
                      <span className="text-textPrimary">Amount:</span> {formatCurrency(pendingTransaction.amount)}
                    </p>
                    <p>
                      <span className="text-textPrimary">Type:</span> {pendingTransaction.type}
                    </p>
                    <p>
                      <span className="text-textPrimary">Category:</span> {pendingTransaction.category}
                    </p>
                    <p>
                      <span className="text-textPrimary">Description:</span> {pendingTransaction.description}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void onConfirmParsedTransaction()} disabled={isSavingConfirmed}>
                      {isSavingConfirmed ? "Saving..." : "Confirm"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={onEditParsedTransaction}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" onClick={onCancelParsedTransaction}>
                      Cancel
                    </Button>
                  </div>
                </Card>
              ) : null}

              {statusMessage ? <p className="text-sm text-textSecondary">{statusMessage}</p> : null}
              {errorMessage ? <p className="text-sm text-expense">{errorMessage}</p> : null}
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
