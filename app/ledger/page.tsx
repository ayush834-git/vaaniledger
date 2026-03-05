"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Trash2, Download, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { formatDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatCurrency";

type FilterType = "all" | "income" | "expense";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function LedgerPage() {
  const { t } = useTranslation();
  const { status, isAuthenticated } = useRequireAuth();
  const { transactions, deleteTransactionRecord, isLoading } = useTransactions();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (filterType !== "all") {
      result = result.filter((item) => item.type === filterType);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((item) =>
        [item.category, item.description ?? "", item.rawInput ?? "", item.type].join(" ").toLowerCase().includes(term),
      );
    }

    return result;
  }, [searchTerm, filterType, transactions]);

  const onDeleteTransaction = async (transactionId: string) => {
    if (deletingId) {
      return;
    }

    setDeletingId(transactionId);
    setErrorMessage(null);

    try {
      await deleteTransactionRecord(transactionId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete transaction.");
    } finally {
      setDeletingId(null);
    }
  };

  const exportCSV = () => {
    const headers = ["Date", "Type", "Category", "Description", "Amount"];
    const rows = filteredTransactions.map((item) => [
      formatDateTime(item.createdAt),
      item.type,
      item.category,
      item.description ?? item.rawInput ?? "",
      item.amount.toString(),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vaaniledger-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (status === "loading" || isLoading || !isAuthenticated) {
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

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "income", label: "Income" },
    { key: "expense", label: "Expense" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-textPrimary">{t("ledger.title")}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={exportCSV} className="gap-2 self-start md:self-auto">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </motion.div>

      {/* Filters + Search */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Filter pills */}
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterType(f.key)}
              className="relative px-4 py-1.5 text-sm font-medium transition-colors"
            >
              {filterType === f.key && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 rounded-lg bg-amber-400/10 border border-amber-400/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${filterType === f.key ? "text-amber-400" : "text-slate-400"}`}>
                {f.label}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            placeholder={t("ledger.search")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20 md:w-72"
          />
        </div>
      </motion.div>

      {errorMessage ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-expense">
          {errorMessage}
        </motion.p>
      ) : null}

      {/* Transaction list */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden !p-0">
          {/* Sticky header row */}
          <div className="hidden md:grid grid-cols-[1.2fr_0.6fr_1fr_2fr_1fr_0.5fr] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span>Date</span>
            <span>Type</span>
            <span>Category</span>
            <span>Description</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Actions</span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
                <span className="text-2xl">📋</span>
              </div>
              <p className="text-sm text-slate-500">{t("ledger.empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              <AnimatePresence>
                {filteredTransactions.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="group grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1fr_2fr_1fr_0.5fr] gap-1 md:gap-2 px-5 py-3 md:py-3 items-center transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                    <span className={`text-xs font-semibold ${item.type === "income" ? "text-income" : "text-expense"}`}>
                      {item.type}
                    </span>
                    <span className="text-sm text-textPrimary">{item.category}</span>
                    <span className="text-sm text-slate-400 truncate">{item.description ?? item.rawInput ?? "-"}</span>
                    <span className={`text-sm font-mono font-semibold text-right ${item.type === "income" ? "text-income" : "text-expense"}`}>
                      {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                    </span>
                    <div className="flex justify-end">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => void onDeleteTransaction(item.id)}
                        disabled={deletingId === item.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                        aria-label="Delete transaction"
                      >
                        {deletingId === item.id ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="h-3.5 w-3.5 rounded-full border border-red-400 border-t-transparent"
                          />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
