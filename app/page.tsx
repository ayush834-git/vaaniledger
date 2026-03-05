"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Send, ArrowRight, X, Pencil } from "lucide-react";

import { MicButtonPlaceholder } from "@/components/mic/MicButtonPlaceholder";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
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
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Hero Section */}
      <motion.div
        variants={itemVariants}
        className="text-center py-2"
      >
        <h1 className="font-display text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
          Bol ke Hisaab
        </h1>
        <p className="mt-3 text-slate-400 text-sm md:text-base">
          Speak or type. Your finances, tracked instantly.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Add Transaction Card */}
        <motion.div variants={itemVariants}>
          <Card className="card-glow">
            <h2 className="mb-5 text-lg font-semibold text-textPrimary flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              {t("add.transaction")}
            </h2>
            <div className="space-y-5">
              <MicButtonPlaceholder onTransactionParsed={onMicParsedTransaction} savedSignal={micSavedSignal} />

              <div className="border-t border-white/5 pt-5">
                <label className="block text-sm text-slate-400 mb-2" htmlFor="transaction-input">
                  {t("home.textInputLabel")}
                </label>
                <div className="flex gap-2">
                  <textarea
                    id="transaction-input"
                    placeholder={t("home.placeholder")}
                    value={manualInput}
                    onChange={(event) => setManualInput(event.target.value)}
                    onKeyDown={onInputKeyDown}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none ring-0 transition-all duration-300 placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-amber-400/20"
                  />
                  <Button
                    type="button"
                    onClick={() => void submitManualInput()}
                    disabled={isSubmitting}
                    className="self-end h-11 w-11 shrink-0 !p-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-600">Example: spent 200 on groceries</p>
              </div>

              {/* Pending Transaction Confirm Panel */}
              <AnimatePresence>
                {pendingTransaction ? (
                  <motion.div
                    initial={{ y: 40, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 40, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 backdrop-blur-sm"
                  >
                    <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Confirm Transaction
                    </p>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Amount</span>
                        <span className="font-mono font-semibold text-textPrimary">{formatCurrency(pendingTransaction.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type</span>
                        <span className={pendingTransaction.type === "income" ? "text-income font-medium" : "text-expense font-medium"}>
                          {pendingTransaction.type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Category</span>
                        <span className="text-textPrimary">{pendingTransaction.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Description</span>
                        <span className="text-textPrimary text-right max-w-[200px] truncate">{pendingTransaction.description}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => void onConfirmParsedTransaction()} disabled={isSavingConfirmed}>
                        {isSavingConfirmed ? "Saving..." : "Confirm"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={onEditParsedTransaction}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button type="button" variant="ghost" onClick={onCancelParsedTransaction}>
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {statusMessage ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-400">
                  {statusMessage}
                </motion.p>
              ) : null}
              {errorMessage ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-expense">
                  {errorMessage}
                </motion.p>
              ) : null}
            </div>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={itemVariants}>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-textPrimary flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              {t("app.recentTransactions")}
            </h2>
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-sm text-slate-500">No transactions yet.</p>
                <p className="text-xs text-slate-600 mt-1">Speak or type to add your first one</p>
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence>
                  {recentTransactions.map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04] hover:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${item.type === "income" ? "bg-green-400" : "bg-red-400"}`} />
                          <span className="font-medium text-sm text-textPrimary">{item.category}</span>
                        </div>
                        <span className={`font-mono text-sm font-semibold ${item.type === "income" ? "text-income" : "text-expense"}`}>
                          {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 pl-5">{item.description ?? item.rawInput ?? "-"}</p>
                      <p className="mt-0.5 text-[10px] text-slate-600 pl-5">{formatDateTime(item.createdAt)}</p>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
