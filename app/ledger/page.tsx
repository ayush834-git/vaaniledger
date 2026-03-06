"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Trash2, Download, Search, X, FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { formatDateTime } from "@/lib/utils/date";
import { exportTransactionsToCsv } from "@/lib/utils/exportCsv";
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount_high" | "amount_low">("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [reportPickerOpen, setReportPickerOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState((new Date().getMonth() + 1).toString());
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReport = async () => {
    setIsDownloading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/report/monthly?month=${reportMonth}&year=${reportYear}`);
      if (!res.ok) throw new Error("Failed to generate report");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaaniledger-${reportYear}-${reportMonth.padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setReportPickerOpen(false);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : t("ledger.reportFailed"));
    } finally {
      setIsDownloading(false);
    }
  };

  const isFiltered = searchTerm !== "" || filterType !== "all" || fromDate !== "" || toDate !== "" || sortOrder !== "newest";

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFromDate("");
    setToDate("");
    setSortOrder("newest");
  };

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (filterType !== "all") result = result.filter((i) => i.type === filterType);
    const term = searchTerm.trim().toLowerCase();
    if (term) result = result.filter((i) => [i.category, i.description ?? "", i.rawInput ?? "", i.type].join(" ").toLowerCase().includes(term));
    
    if (fromDate) {
      const from = new Date(fromDate).getTime();
      result = result.filter((i) => new Date(i.createdAt).getTime() >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter((i) => new Date(i.createdAt).getTime() <= to.getTime());
    }

    result = [...result].sort((a, b) => {
      if (sortOrder === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOrder === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOrder === "amount_high") return b.amount - a.amount;
      if (sortOrder === "amount_low") return a.amount - b.amount;
      return 0;
    });

    return result;
  }, [searchTerm, filterType, fromDate, toDate, sortOrder, transactions]);

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
    const d = new Date();
    const filename = `vaaniledger-export-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.csv`;
    exportTransactionsToCsv(filteredTransactions, filename);
    setSuccessMessage("Exported!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if ((status === "loading" || isLoading) && !isAuthenticated) {
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



  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between z-10 relative">
        <div>
          <h2 className="font-display text-3xl font-bold text-textPrimary">{t("ledger.title")}</h2>
          <p className="mt-1 text-sm text-textSecondary">
            {t("ledger.showing", { count: filteredTransactions.length, total: transactions.length })}
          </p>
        </div>
        
        <div className="relative">
          <Button onClick={() => setReportPickerOpen((prev) => !prev)} className="gap-2 shrink-0">
            <FileText className="h-4 w-4" /> {t("ledger.downloadReport")}
          </Button>

          <AnimatePresence>
            {reportPickerOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-accent/12 bg-white p-4 shadow-xl z-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-textPrimary">{t("ledger.selectMonth")}</h3>
                  <button onClick={() => setReportPickerOpen(false)} className="text-textSecondary hover:text-textPrimary bg-surface rounded-md p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  <select value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="flex-1 rounded-lg border border-accent/12 bg-surface px-3 py-1.5 text-sm outline-none w-1/2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
                    ))}
                  </select>
                  <select value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="flex-1 rounded-lg border border-accent/12 bg-surface px-3 py-1.5 text-sm outline-none w-1/2">
                    {[...Array(5)].map((_, i) => {
                      const y = new Date().getFullYear() - i;
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>
                </div>
                <Button onClick={downloadReport} disabled={isDownloading} className="w-full justify-center">
                  {isDownloading ? t("ledger.generating") : t("ledger.downloadPdf")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary/50" />
              <input placeholder={t("ledger.search")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-accent/12 bg-white py-2 pl-10 pr-4 text-sm text-textPrimary outline-none transition placeholder:text-textSecondary/50 focus:border-accent/40 focus:ring-2 focus:ring-accent/15" />
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex gap-1 rounded-xl border border-accent/12 bg-surface p-1">
                {filters.map((f) => (
                  <button key={f.key} type="button" onClick={() => setFilterType(f.key)} className="relative px-4 py-1.5 text-sm font-medium transition-colors">
                    {filterType === f.key && (
                      <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-lg bg-accent" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                    )}
                    <span className={`relative z-10 ${filterType === f.key ? "text-white" : "text-textSecondary"}`}>{f.label}</span>
                  </button>
                ))}
              </div>
              <Button type="button" variant="ghost" onClick={exportCSV} className="gap-2 h-9 px-3 border border-accent/12 bg-white hover:bg-surface">
                <Download className="h-4 w-4" /> {t("ledger.exportCsv")}
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap md:flex-nowrap gap-4 items-center w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-textSecondary uppercase tracking-wide">Date:</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-accent/12 bg-white px-3 py-1.5 text-sm text-textPrimary outline-none focus:border-accent/40" />
                <span className="text-xs text-textSecondary">to</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-accent/12 bg-white px-3 py-1.5 text-sm text-textPrimary outline-none focus:border-accent/40" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-textSecondary uppercase tracking-wide">Sort:</span>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className="rounded-lg border border-accent/12 bg-white px-3 py-1.5 text-sm text-textPrimary outline-none focus:border-accent/40">
                  <option value="newest">{t("ledger.sort.newest")}</option>
                  <option value="oldest">{t("ledger.sort.oldest")}</option>
                  <option value="amount_high">{t("ledger.sort.amountHigh")}</option>
                  <option value="amount_low">{t("ledger.sort.amountLow")}</option>
                </select>
              </div>
            </div>

            {isFiltered && (
              <button type="button" onClick={clearFilters} className="text-sm font-medium text-accent hover:underline flex items-center gap-1">
                <X className="h-3 w-3" /> {t("ledger.clearFilters")}
              </button>
            )}
          </div>
        </Card>
      </motion.div>

      {errorMessage ? <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-expense">{errorMessage}</motion.p> : null}
      {successMessage ? <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-income">{successMessage}</motion.p> : null}

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
