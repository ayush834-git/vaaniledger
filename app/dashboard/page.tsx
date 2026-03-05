"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, animate, AnimatePresence, type Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MessageCircle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { ExpensePieChart } from "@/components/charts/ExpensePieChart";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { ProfitLineChart } from "@/components/charts/ProfitLineChart";
import { Card } from "@/components/ui/Card";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { useTransactions } from "@/lib/hooks/useTransactions";
import type { TransactionRecord } from "@/lib/types/domain";
import { formatDateTime } from "@/lib/utils/date";

const DAY_MS = 24 * 60 * 60 * 1000;

function AnimatedNumber({ value, prefix = "₹" }: { value: number; prefix?: string }) {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(`${prefix}0`);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      ease: "easeOut",
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

  const dayBuckets = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    const label = date.toLocaleDateString("en-IN", { weekday: "short" });
    return {
      day: label,
      dateKey: date.toISOString().slice(0, 10),
      income: 0,
      expense: 0,
    };
  });

  const bucketMap = new Map(dayBuckets.map((bucket) => [bucket.dateKey, bucket]));
  for (const transaction of transactions) {
    const dateKey = new Date(transaction.createdAt).toISOString().slice(0, 10);
    const bucket = bucketMap.get(dateKey);
    if (!bucket) {
      continue;
    }
    if (transaction.type === "income") {
      bucket.income += transaction.amount;
    } else {
      bucket.expense += transaction.amount;
    }
  }

  return dayBuckets.map(({ day, income, expense }) => ({ day, income, expense }));
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
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
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const todayItems = transactions.filter((item) => new Date(item.createdAt).getTime() >= start.getTime());
    const income = todayItems
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = todayItems
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expenses,
      netProfit: income - expenses,
    };
  }, [transactions]);

  const summaryCards = [
    {
      id: "income",
      label: "Today Income",
      amount: todaySummary.income,
      borderColor: "border-l-green-400",
      textColor: "text-income",
      icon: TrendingUp,
      iconColor: "text-green-400",
    },
    {
      id: "expense",
      label: "Today Expense",
      amount: todaySummary.expenses,
      borderColor: "border-l-red-400",
      textColor: "text-expense",
      icon: TrendingDown,
      iconColor: "text-red-400",
    },
    {
      id: "profit",
      label: "Net Profit",
      amount: todaySummary.netProfit,
      borderColor: "border-l-amber-400",
      textColor: "text-accent",
      icon: DollarSign,
      iconColor: "text-amber-400",
    },
  ];

  const expensePieData = useMemo(() => {
    const totals = transactions
      .filter((item) => item.type === "expense")
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + item.amount;
        return acc;
      }, {});

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions]);

  const incomeExpenseByDay = useMemo(() => buildLast7DaysIncomeExpense(transactions), [transactions]);

  const profitTrend = useMemo(
    () =>
      incomeExpenseByDay.map((row) => ({
        day: row.day,
        value: row.income - row.expense,
      })),
    [incomeExpenseByDay],
  );

  const latestTransaction = transactions[0] ?? null;

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page title */}
      <motion.div variants={itemVariants}>
        <h2 className="font-display text-3xl font-bold text-textPrimary">{t("dashboard.title")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("dashboard.summary")}</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <motion.div key={card.id} variants={itemVariants}>
            <Card className={`border-l-4 ${card.borderColor} relative overflow-hidden`}>
              {/* Subtle sparkline bg */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                background: `linear-gradient(135deg, transparent 40%, ${card.id === "income" ? "#22C55E" : card.id === "expense" ? "#EF4444" : "#F59E0B"} 100%)`,
              }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                <p className={`font-mono text-3xl font-bold ${card.textColor}`}>
                  <AnimatedNumber value={card.amount} />
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-3">
        <ExpensePieChart data={expensePieData} />
        <IncomeExpenseBarChart data={incomeExpenseByDay} />
        <ProfitLineChart data={profitTrend} />
      </motion.div>

      {/* Insights + Latest */}
      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            {t("dashboard.insights")}
          </h3>
          <div className="space-y-3 mt-4">
            {latestTransaction ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3"
              >
                <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-textPrimary">Latest transaction synced</p>
                  <p className="mt-1 text-slate-400">{latestTransaction.description ?? latestTransaction.rawInput}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(latestTransaction.createdAt)}</p>
                </div>
              </motion.div>
            ) : (
              <p className="text-sm text-slate-500">No transactions recorded yet.</p>
            )}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3"
            >
              <div className="mt-0.5 h-2 w-2 rounded-full bg-green-400 shrink-0" />
              <p className="text-sm text-slate-400">
                {transactions.length > 0
                  ? `${transactions.length} total transactions tracked. Use the chat to ask about trends.`
                  : "Start adding transactions to see AI-powered insights here."}
              </p>
            </motion.div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-textPrimary flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400" />
              {t("dashboard.chat")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Ask about your spending patterns, profit trends, or get financial advice.
            </p>
          </div>
          <div className="mt-4 flex items-end justify-end">
            <motion.button
              onClick={() => setIsChatOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
              whileHover={{ scale: 1.1, rotate: 8 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle className="h-5 w-5 text-black" />
            </motion.button>
          </div>
        </Card>
      </motion.div>

      {/* Floating Chat FAB */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)]"
            whileHover={{ scale: 1.1, rotate: 8 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageCircle className="h-6 w-6 text-black" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && <ChatPanel onClose={() => setIsChatOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
