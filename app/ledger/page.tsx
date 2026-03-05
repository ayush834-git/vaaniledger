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
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
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
    if (filterType !== "all") result = result.filter((i) => i.type === filterType);
    const term = searchTerm.trim().toLowerCase();
    if (term) result = result.filter((i) => [i.category, i.description ?? "", i.rawInput ?? "", i.type].join(" ").toLowerCase().includes(term));
    return result;
  }, [searchTerm, filterType, transactions]);

  const onDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id); setErrorMessage(null);
    try { await deleteTransactionRecord(id); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Failed to delete."); }
    finally { setDeletingId(null); }
  };

  const translateType = (type: string) => {
    if (type === "income") return t("ledger.income");
    if (type === "expense") return t("ledger.expense");
    return type;
  };

  const exportCSV = () => {
    const headers = [t("common.date"), t("common.type"), t("common.category"), t("common.description"), t("common.amount")];
    const rows = filteredTransactions.map((i) => [formatDateTime(i.createdAt), translateType(i.type), i.category, i.description ?? i.rawInput ?? "", i.amount.toString()]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "vaaniledger-transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (status === "loading" || isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: t("ledger.all") },
    { key: "income", label: t("ledger.income") },
    { key: "expense", label: t("ledger.expense") },
  ];

  const count = filteredTransactions.length;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-textPrimary">{t("ledger.title")}</h2>
          <p className="mt-1 text-sm text-textSecondary">
            {count === 1
              ? t("ledger.transactionCount", { count })
              : t("ledger.transactionCount_plural", { count })}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={exportCSV} className="gap-2 self-start md:self-auto"><Download className="h-4 w-4" />{t("ledger.exportCsv")}</Button>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1 rounded-xl border border-accent/12 bg-white p-1">
          {filters.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilterType(f.key)} className="relative px-4 py-1.5 text-sm font-medium transition-colors">
              {filterType === f.key && (
                <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-lg bg-accent" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
              <span className={`relative z-10 ${filterType === f.key ? "text-white" : "text-textSecondary"}`}>{f.label}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary/50" />
          <input placeholder={t("ledger.search")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-accent/12 bg-white py-2.5 pl-10 pr-4 text-sm text-textPrimary outline-none transition placeholder:text-textSecondary/50 focus:border-accent/40 focus:ring-2 focus:ring-accent/15 md:w-72" />
        </div>
      </motion.div>

      {errorMessage ? <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-expense">{errorMessage}</motion.p> : null}

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden !p-0">
          <div className="hidden md:grid grid-cols-[1.2fr_0.6fr_1fr_2fr_1fr_0.5fr] gap-2 border-b border-accent/[0.08] bg-surface px-5 py-3 text-xs font-medium text-textSecondary uppercase tracking-wider">
            <span>{t("common.date")}</span><span>{t("common.type")}</span><span>{t("common.category")}</span><span>{t("common.description")}</span><span className="text-right">{t("common.amount")}</span><span className="text-right">{t("common.actions")}</span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-accent/5 border border-accent/12 flex items-center justify-center mb-3"><span className="text-2xl">📋</span></div>
              <p className="text-sm text-textSecondary">{t("ledger.empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-accent/[0.06]">
              <AnimatePresence>
                {filteredTransactions.map((item, index) => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: index * 0.02 }}
                    className="group grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_1fr_2fr_1fr_0.5fr] gap-1 md:gap-2 px-5 py-3 items-center transition-colors hover:bg-surface">
                    <span className="text-xs text-textSecondary">{formatDateTime(item.createdAt)}</span>
                    <span className={`text-xs font-semibold ${item.type === "income" ? "text-income" : "text-expense"}`}>{translateType(item.type)}</span>
                    <span className="text-sm text-textPrimary">{item.category}</span>
                    <span className="text-sm text-textSecondary truncate">{item.description ?? item.rawInput ?? "-"}</span>
                    <span className={`text-sm font-mono font-semibold text-right ${item.type === "income" ? "text-income" : "text-expense"}`}>{item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}</span>
                    <div className="flex justify-end">
                      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => void onDelete(item.id)} disabled={deletingId === item.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-textSecondary/60 transition hover:bg-expense/10 hover:text-expense disabled:opacity-50" aria-label="Delete">
                        {deletingId === item.id ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-3.5 w-3.5 rounded-full border border-expense border-t-transparent" />
                        ) : (<Trash2 className="h-3.5 w-3.5" />)}
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
