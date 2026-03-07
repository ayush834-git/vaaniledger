"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, animate, AnimatePresence, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MessageCircle, TrendingUp, TrendingDown, IndianRupee, X } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { ExpensePieChart } from "@/components/charts/ExpensePieChart";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { ProfitLineChart } from "@/components/charts/ProfitLineChart";
import { Card } from "@/components/ui/Card";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useTransactions } from "@/lib/hooks/useTransactions";
import type { TransactionRecord, BudgetGoalRecord } from "@/lib/types/domain";
import { formatDateTime } from "@/lib/utils/date";

const DAY_MS = 24 * 60 * 60 * 1000;

function AnimatedNumber({ value, prefix = "\u20B9" }: { value: number; prefix?: string }) {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(`${prefix}0`);
  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2, ease: "easeOut",
      onUpdate: (v) => setDisplayValue(`${prefix}${Math.round(v).toLocaleString("en-IN")}`),
    });
    return controls.stop;
  }, [value, count, prefix]);
  return <span>{displayValue}</span>;
}

const toLocalISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const buildLast7DaysIncomeExpense = (transactions: TransactionRecord[]) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const dayBuckets = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(start.getTime() + i * DAY_MS);
    return { day: date.toLocaleDateString("en-IN", { weekday: "short" }), dateKey: toLocalISODate(date), income: 0, expense: 0 };
  });
  const map = new Map(dayBuckets.map((b) => [b.dateKey, b]));
  for (const tx of transactions) {
    const txDate = new Date(tx.createdAt);
    const key = toLocalISODate(txDate);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (tx.type === "income") bucket.income += tx.amount; else bucket.expense += tx.amount;
  }
  return dayBuckets.map(({ day, income, expense }) => ({ day, income, expense }));
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface InsightUI {
  id: string;
  type: string;
  message: string;
  dismissed: boolean;
}

const getInsightDotColor = (type: string) => {
  if (type === "SPENDING_SPIKE") return "bg-accent";
  if (type === "CASHFLOW") return "bg-income";
  return "bg-expense";
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const { status, isAuthenticated } = useRequireAuth();
  const { transactions, isLoading } = useTransactions();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [insights, setInsights] = useState<InsightUI[]>([]);
  const [goals, setGoals] = useState<BudgetGoalRecord[]>([]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const timer = setTimeout(() => {
      fetch('/api/insights')
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.insights) {
            setInsights(data.insights.filter((i: InsightUI) => !i.dismissed));
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, transactions.length]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetch("/api/goals")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.data) {
            setGoals(data.data);
          }
        });

      fetch("/api/transactions/process-recurring").catch(console.error);
    }
  }, [isAuthenticated, isLoading]);

  const handleDismiss = async (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/insights/${id}/dismiss`, { method: "POST" });
  };

  const todaySummary = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = transactions.filter((i) => new Date(i.createdAt).getTime() >= start.getTime());
    const income = today.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0);
    const expenses = today.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);
    return { income, expenses, netProfit: income - expenses };
  }, [transactions]);

  const summaryCards = [
    { id: "income", label: t("dashboard.todayIncome"), amount: todaySummary.income, textColor: "text-income", icon: TrendingUp, iconColor: "text-income", gradColor: "#00A86B" },
    { id: "expense", label: t("dashboard.todayExpense"), amount: todaySummary.expenses, textColor: "text-expense", icon: TrendingDown, iconColor: "text-expense", gradColor: "#E8003D" },
    { id: "profit", label: t("dashboard.netProfit"), amount: todaySummary.netProfit, textColor: "text-accent", icon: IndianRupee, iconColor: "text-accent", gradColor: "#FF5500" },
  ];

  /* Top categories — includes BOTH income and expense */
  const topCategoriesData = useMemo(() => {
    const totals: Record<string, { value: number; type: "income" | "expense" }> = {};
    for (const tx of transactions) {
      const key = `${tx.category}__${tx.type}`;
      if (!totals[key]) totals[key] = { value: 0, type: tx.type };
      totals[key].value += tx.amount;
    }
    return Object.entries(totals)
      .map(([key, data]) => ({ name: key.split("__")[0], value: data.value, type: data.type }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions]);

  const combinedPieData = useMemo(() => {
    return topCategoriesData.map(item => ({
      name: item.name,
      value: item.value,
      type: item.type,
    }));
  }, [topCategoriesData]);

  const incomeExpenseByDay = useMemo(() => buildLast7DaysIncomeExpense(transactions), [transactions]);
  const profitTrend = useMemo(() => incomeExpenseByDay.map((r) => ({ day: r.day, value: r.income - r.expense })), [incomeExpenseByDay]);
  const latestTransaction = transactions[0] ?? null;

  const currentMonthSpendingByCategory = useMemo(() => {
    const now = new Date();
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      const d = new Date(tx.createdAt);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        map[tx.category] = (map[tx.category] || 0) + Number(tx.amount);
      }
    }
    return map;
  }, [transactions]);

  if ((status === "loading" || isLoading) && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h2 className="font-display text-3xl font-bold text-textPrimary">{t("dashboard.title")}</h2>
        <p className="mt-1 text-sm text-textSecondary">{t("dashboard.summary")}</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <motion.div key={card.id} variants={itemVariants}>
            <Card className="relative overflow-hidden group">
              <div className="absolute inset-0 opacity-[0.02] transition-opacity group-hover:opacity-[0.04]" style={{ background: `linear-gradient(135deg, transparent 40%, ${card.gradColor} 100%)` }} />
              <div className="relative flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-widest text-textSecondary">{card.label}</p>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                <p className={`font-mono text-3xl font-bold ${card.textColor}`}><AnimatedNumber value={card.amount} /></p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {insights.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {insights.map((insight) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95, overflow: "hidden" }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group flex items-center justify-between shadow-resting">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${getInsightDotColor(insight.type)}`} />
                    <p className="text-sm font-medium text-textPrimary">{insight.message}</p>
                  </div>
                  <button
                    onClick={() => handleDismiss(insight.id)}
                    className="ml-4 shrink-0 rounded-lg p-1 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface hover:text-expense"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {goals.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="min-h-[120px]">
            <h3 className="text-lg font-semibold text-textPrimary flex items-center gap-2 mb-4">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              Budget Status
            </h3>
            <div className="space-y-4">
              {goals.map((goal) => {
                const spent = currentMonthSpendingByCategory[goal.category] || 0;
                const progress = Math.min((spent / goal.amount) * 100, 100);
                const colorClass = progress > 90 ? "bg-expense" : progress > 70 ? "bg-amber-500" : "bg-income";
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="font-medium text-textPrimary">{goal.category}</span>
                      <span className="text-textSecondary">
                        {Math.round(progress)}% ({spent.toLocaleString("en-IN", { style: "currency", currency: "INR" })} / {goal.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-accent/10">
                      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="col-span-1 md:col-span-5 relative flex flex-col min-h-[320px] [&_>_div]:flex-1 [&_>_div]:flex [&_>_div]:flex-col">
          <ExpensePieChart data={combinedPieData} />
        </div>
        <div className="col-span-1 md:col-span-7 flex flex-col min-h-[320px] [&_>_div]:flex-1 [&_>_div]:flex [&_>_div]:flex-col">
          <IncomeExpenseBarChart data={incomeExpenseByDay} />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="col-span-1 md:col-span-12 flex flex-col min-h-[300px]">
          <ProfitLineChart data={profitTrend} />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <Card className="col-span-1 md:col-span-7 min-h-[200px]">
          <h3 className="text-lg font-semibold text-textPrimary flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent" />{t("dashboard.insights")}
          </h3>
          <div className="space-y-3 mt-4">
            {latestTransaction ? (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-3 rounded-lg border border-accent/[0.08] bg-surface p-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-textPrimary">{t("dashboard.latestSynced")}</p>
                  <p className="mt-1 text-textSecondary">{latestTransaction.description ?? latestTransaction.rawInput}</p>
                  <p className="mt-1 text-xs text-textSecondary/60">{formatDateTime(latestTransaction.createdAt)}</p>
                </div>
              </motion.div>
            ) : (
              <p className="text-sm text-textSecondary">{t("dashboard.noTransactions")}</p>
            )}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-start gap-3 rounded-lg border border-accent/[0.08] bg-surface p-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-income shrink-0" />
              <p className="text-sm text-textSecondary">
                {transactions.length > 0 ? t("dashboard.totalTracked", { count: transactions.length }) : t("dashboard.noTransactions")}
              </p>
            </motion.div>
          </div>
        </Card>

        <Card className="col-span-1 md:col-span-5 flex flex-col justify-between min-h-[200px]">
          <div>
            <h3 className="text-lg font-semibold text-textPrimary flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-secondary" />{t("dashboard.chat")}
            </h3>
            <p className="mt-2 text-sm text-textSecondary">{t("dashboard.chatPrompt")}</p>
          </div>
          <div className="mt-4 flex items-end justify-end">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <motion.button onClick={() => setIsChatOpen(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-resting hover:shadow-hover" whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
                    <MessageCircle className="h-6 w-6 text-white" />
                  </motion.button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="rounded-lg bg-textPrimary px-3 py-1.5 text-xs font-medium text-white shadow-resting" sideOffset={8}>
                    Ask Vaani
                    <Tooltip.Arrow className="fill-textPrimary" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {!isChatOpen && (
          <div className="fixed bottom-6 right-6 z-50 flex">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <motion.button 
                    initial={{ scale: 0, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0, opacity: 0 }} 
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => setIsChatOpen(true)}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-resting hover:shadow-hover"
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                  >
                    <MessageCircle className="h-6 w-6 text-white" />
                  </motion.button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="rounded-lg bg-textPrimary px-3 py-1.5 text-xs font-medium text-white shadow-resting" sideOffset={8}>
                    Ask Vaani
                    <Tooltip.Arrow className="fill-textPrimary" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>{isChatOpen && <ChatPanel onClose={() => setIsChatOpen(false)} />}</AnimatePresence>
    </motion.div>
  );
}
