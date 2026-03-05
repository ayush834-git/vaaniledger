"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, animate, AnimatePresence, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MessageCircle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { TopCategoriesChart } from "@/components/charts/TopCategoriesChart";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { ProfitLineChart } from "@/components/charts/ProfitLineChart";
import { Card } from "@/components/ui/Card";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useTransactions } from "@/lib/hooks/useTransactions";
import type { TransactionRecord } from "@/lib/types/domain";
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

const buildLast7DaysIncomeExpense = (transactions: TransactionRecord[]) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const dayBuckets = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(start.getTime() + i * DAY_MS);
    return { day: date.toLocaleDateString("en-IN", { weekday: "short" }), dateKey: date.toISOString().slice(0, 10), income: 0, expense: 0 };
  });
  const map = new Map(dayBuckets.map((b) => [b.dateKey, b]));
  for (const tx of transactions) {
    const key = new Date(tx.createdAt).toISOString().slice(0, 10);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (tx.type === "income") bucket.income += tx.amount; else bucket.expense += tx.amount;
  }
  return dayBuckets.map(({ day, income, expense }) => ({ day, income, expense }));
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const { status, isAuthenticated } = useRequireAuth();
  const { transactions, isLoading } = useTransactions();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const todaySummary = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = transactions.filter((i) => new Date(i.createdAt).getTime() >= start.getTime());
    const income = today.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0);
    const expenses = today.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);
    return { income, expenses, netProfit: income - expenses };
  }, [transactions]);

  const summaryCards = [
    { id: "income", label: t("dashboard.todayIncome"), amount: todaySummary.income, borderColor: "border-l-income", textColor: "text-income", icon: TrendingUp, iconColor: "text-income", gradColor: "#00A86B" },
    { id: "expense", label: t("dashboard.todayExpense"), amount: todaySummary.expenses, borderColor: "border-l-expense", textColor: "text-expense", icon: TrendingDown, iconColor: "text-expense", gradColor: "#E8003D" },
    { id: "profit", label: t("dashboard.netProfit"), amount: todaySummary.netProfit, borderColor: "border-l-accent", textColor: "text-accent", icon: DollarSign, iconColor: "text-accent", gradColor: "#FF5500" },
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

  const incomeExpenseByDay = useMemo(() => buildLast7DaysIncomeExpense(transactions), [transactions]);
  const profitTrend = useMemo(() => incomeExpenseByDay.map((r) => ({ day: r.day, value: r.income - r.expense })), [incomeExpenseByDay]);
  const latestTransaction = transactions[0] ?? null;

  if (status === "loading" || isLoading || !isAuthenticated) {
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
            <Card className={`border-l-4 ${card.borderColor} relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-[0.04]" style={{ background: `linear-gradient(135deg, transparent 40%, ${card.gradColor} 100%)` }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-textSecondary">{card.label}</p>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                <p className={`font-mono text-3xl font-bold ${card.textColor}`}><AnimatedNumber value={card.amount} /></p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-3">
        <TopCategoriesChart data={topCategoriesData} />
        <IncomeExpenseBarChart data={incomeExpenseByDay} />
        <ProfitLineChart data={profitTrend} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
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

        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-textPrimary flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-secondary" />{t("dashboard.chat")}
            </h3>
            <p className="mt-2 text-sm text-textSecondary">{t("dashboard.chatPrompt")}</p>
          </div>
          <div className="mt-4 flex items-end justify-end">
            <motion.button onClick={() => setIsChatOpen(true)} className="flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-glow" whileHover={{ scale: 1.1, rotate: 8 }} whileTap={{ scale: 0.95 }}>
              <MessageCircle className="h-5 w-5 text-white" />
            </motion.button>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {!isChatOpen && (
          <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-glow" whileHover={{ scale: 1.1, rotate: 8 }} whileTap={{ scale: 0.95 }}>
            <MessageCircle className="h-6 w-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>{isChatOpen && <ChatPanel onClose={() => setIsChatOpen(false)} />}</AnimatePresence>
    </motion.div>
  );
}
