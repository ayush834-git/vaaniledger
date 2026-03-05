"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { ExpensePieChart } from "@/components/charts/ExpensePieChart";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { ProfitLineChart } from "@/components/charts/ProfitLineChart";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageSection } from "@/components/ui/PageSection";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import type { TransactionRecord } from "@/lib/types/domain";
import {
  getStoredTransactions,
  refreshStoredTransactionsFromApi,
  subscribeToTransactionCreated,
  subscribeToTransactionsChange,
} from "@/lib/utils/clientTransactions";
import { formatDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const DAY_MS = 24 * 60 * 60 * 1000;

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

export default function DashboardPage() {
  const { t } = useTranslation();
  const { status, isAuthenticated } = useRequireAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    setTransactions(getStoredTransactions());
    const unsubscribeCreated = subscribeToTransactionCreated((transaction) => {
      setTransactions((previous) => [transaction, ...previous.filter((item) => item.id !== transaction.id)]);
    });
    const unsubscribeChanged = subscribeToTransactionsChange((next) => {
      setTransactions(next);
    });

    void refreshStoredTransactionsFromApi().catch(() => undefined);

    return () => {
      unsubscribeCreated();
      unsubscribeChanged();
    };
  }, []);

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
    { id: "income", label: "Today Income", amount: todaySummary.income, color: "text-income" },
    { id: "expense", label: "Today Expense", amount: todaySummary.expenses, color: "text-expense" },
    { id: "profit", label: "Net Profit", amount: todaySummary.netProfit, color: "text-accent" },
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

  if (status === "loading" || !isAuthenticated) {
    return <div className="text-sm text-textSecondary">Checking authentication...</div>;
  }

  return (
    <PageSection title={t("dashboard.title")} subtitle={t("dashboard.summary")}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.id}>
              <p className="text-sm text-textSecondary">{card.label}</p>
              <p className={`mt-2 font-mono text-2xl font-semibold ${card.color}`}>
                {formatCurrency(card.amount)}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ExpensePieChart data={expensePieData} />
          <IncomeExpenseBarChart data={incomeExpenseByDay} />
          <ProfitLineChart data={profitTrend} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h3 className="text-lg font-semibold">{t("dashboard.insights")}</h3>
            <p className="mt-3 text-sm text-textSecondary">
              AI insights panel placeholder. Data-backed insights will be added in Phase 2.
            </p>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-textSecondary">
              {latestTransaction ? (
                <>
                  <p className="font-medium text-textPrimary">Latest transaction synced</p>
                  <p className="mt-1">{latestTransaction.description ?? latestTransaction.rawInput}</p>
                  <p className="mt-1 text-xs">{formatDateTime(latestTransaction.createdAt)}</p>
                </>
              ) : (
                <p>No transactions recorded yet.</p>
              )}
            </div>
          </Card>
          <Card className="relative overflow-hidden">
            <h3 className="text-lg font-semibold">{t("dashboard.chat")}</h3>
            <div className="mt-4 flex h-36 items-end justify-end">
              <Button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold shadow-soft"
                onClick={() => setIsChatOpen(true)}
              >
                Chatbot Bubble
              </Button>
            </div>
          </Card>
        </div>
      </div>
      {isChatOpen ? <ChatPanel onClose={() => setIsChatOpen(false)} /> : null}
    </PageSection>
  );
}
