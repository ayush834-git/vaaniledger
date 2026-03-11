"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Trash2, Download, Search, X, FileText, TrendingUp, TrendingDown } from "lucide-react";

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
          <Button onClick={() => setReportPickerOpen((prev) => !prev)} className="gap-2 shrink-0 w-full md:w-auto justify-center">
            <FileText className="h-4 w-4" /> {t("ledger.downloadReport")}
          </Button>

          <AnimatePresence>
            {reportPickerOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-64 rounded-xl border border-accent/12 bg-white p-4 shadow-xl z-50">
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

      <motion.div variants={itemVariants} className="sticky top-20 z-40 bg-[#FDFAF8]/90 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <Card className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary/50" />
              <input placeholder={t("ledger.search")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 rounded-xl border border-accent/12 bg-white py-2 pl-10 pr-4 text-sm text-textPrimary outline-none transition placeholder:text-textSecondary/50 focus:border-accent/40 focus:ring-2 focus:ring-accent/10" />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex gap-1 rounded-xl border border-accent/12 bg-surface p-1 overflow-x-auto">
                {filters.map((f) => (
                  <button key={f.key} type="button" onClick={() => setFilterType(f.key)} className="relative px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none">
                    {filterType === f.key && (
                      <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-lg bg-accent" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                    )}
                    <span className={`relative z-10 ${filterType === f.key ? "text-white" : "text-textSecondary"}`}>{f.label}</span>
                  </button>
                ))}
              </div>
              <Button type="button" variant="ghost" onClick={exportCSV} className="gap-2 h-10 px-3 border border-accent/12 bg-white hover:bg-surface justify-center sm:justify-start">
                <Download className="h-4 w-4" /> {t("ledger.exportCsv")}
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-textSecondary uppercase tracking-wide">Date:</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl h-10 border border-accent/12 bg-white px-3 py-1.5 text-sm text-textPrimary outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 flex-1 min-w-[130px]" />
                <span className="text-xs text-textSecondary">to</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl h-10 border border-accent/12 bg-white px-3 py-1.5 text-sm text-textPrimary outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 flex-1 min-w-[130px]" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-textSecondary uppercase tracking-wide">Sort:</span>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)} className="rounded-xl h-10 border border-accent/12 bg-white px-3 py-1.5 text-sm text-textPrimary outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 flex-1">
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

      <motion.div variants={itemVariants} className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 mb-4 flex items-center justify-center rounded-2xl bg-accent/5">
              <span className="text-3xl">💳</span>
            </div>
            <p className="text-textSecondary">{t("ledger.empty")}</p>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredTransactions.map((item) => (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, scale: 0.98, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, height: 0 }} 
                transition={{ duration: 0.2 }}
              >
                <Card className={`group flex flex-col md:flex-row md:items-center justify-between p-4 py-4 shadow-resting border-l-4 ${item.type === "income" ? "border-l-income" : "border-l-expense"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 flex shrink-0 items-center justify-center rounded-2xl bg-surface ${item.type === "income" ? "text-income" : "text-expense"}`}>
                      {item.type === "income" ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                      <p className="font-medium text-base text-textPrimary">{item.category}</p>
                      <p className="mt-0.5 text-sm text-textSecondary">{item.description || item.rawInput || "-"}</p>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center justify-between md:justify-end gap-6 ml-16 md:ml-0">
                    <div className="flex flex-col md:items-end gap-1">
                      <span className={`font-mono text-lg font-bold ${item.type === "income" ? "text-income" : "text-expense"}`}>
                        {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                      </span>
                      <span className="text-xs text-textSecondary">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <motion.button 
                      type="button" 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => void onDelete(item.id)} 
                      disabled={deletingId === item.id}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-textSecondary opacity-100 md:opacity-0 group-hover:opacity-100 transition-all hover:bg-expense/10 hover:text-expense disabled:opacity-50" 
                      aria-label="Delete"
                    >
                      {deletingId === item.id ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-4 w-4 rounded-full border border-expense border-t-transparent" />
                      ) : (<Trash2 className="h-4 w-4" />)}
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  );
}
